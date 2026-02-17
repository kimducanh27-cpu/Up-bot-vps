# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║     AUTO CHECK BOTNET - WEB DASHBOARD                                        ║
║     Flask Backend với Gemini AI Integration                                  ║
║     Phát hiện và xử lý mối đe dọa bảo mật                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from flask import Flask, render_template, jsonify, request
import subprocess
import os
import re
import json
import socket
from datetime import datetime
import threading

# ========== CONFIGURATION ==========
GEMINI_API_KEY = "AIzaSyCIB9_qc-Y1g_j1YyChb1JOlCLa0HOqyn4"
GEMINI_MODEL = "gemini-2.5-flash"

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# ========== GLOBAL DATA STORE ==========
scan_results = {
    "status": "idle",
    "last_scan": None,
    "connections": [],
    "processes": [],
    "threats": [],
    "ai_analysis": None
}

# ========== SYSTEM SCAN FUNCTIONS ==========

def get_network_connections():
    """Lấy danh sách các kết nối mạng"""
    connections = []
    try:
        result = subprocess.run(
            ['netstat', '-ano'],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        
        lines = result.stdout.strip().split('\n')
        for line in lines[4:]:  # Skip header lines
            parts = line.split()
            if len(parts) >= 5:
                proto = parts[0]
                local_addr = parts[1]
                foreign_addr = parts[2]
                state = parts[3] if len(parts) > 3 else ""
                pid = parts[-1]
                
                # Parse addresses
                if ':' in foreign_addr and foreign_addr != '*:*':
                    try:
                        ip, port = foreign_addr.rsplit(':', 1)
                        if ip not in ['0.0.0.0', '127.0.0.1', '[::]', '[::1]', '*']:
                            connections.append({
                                "protocol": proto,
                                "local": local_addr,
                                "remote_ip": ip.strip('[]'),
                                "remote_port": port,
                                "state": state,
                                "pid": pid,
                                "process_name": get_process_name(pid),
                                "threat_level": analyze_connection_threat(ip, port)
                            })
                    except:
                        pass
    except Exception as e:
        print(f"Error getting connections: {e}")
    
    return connections

def get_process_name(pid):
    """Lấy tên tiến trình từ PID"""
    try:
        result = subprocess.run(
            ['tasklist', '/FI', f'PID eq {pid}', '/FO', 'CSV', '/NH'],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        if result.stdout.strip():
            parts = result.stdout.strip().split(',')
            if parts:
                return parts[0].strip('"')
    except:
        pass
    return "Unknown"

def get_running_processes():
    """Lấy danh sách tiến trình đang chạy"""
    processes = []
    try:
        result = subprocess.run(
            ['wmic', 'process', 'get', 'Name,ProcessId,ExecutablePath,CommandLine', '/format:csv'],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        
        lines = result.stdout.strip().split('\n')
        for line in lines[1:]:  # Skip header
            if line.strip():
                parts = line.split(',')
                if len(parts) >= 4:
                    proc = {
                        "name": parts[1] if len(parts) > 1 else "",
                        "pid": parts[3] if len(parts) > 3 else "",
                        "path": parts[2] if len(parts) > 2 else "",
                        "cmdline": parts[0] if len(parts) > 0 else "",
                        "threat_level": "safe"
                    }
                    
                    # Analyze threat level
                    proc["threat_level"] = analyze_process_threat(proc)
                    
                    if proc["name"] and proc["pid"]:
                        processes.append(proc)
    except Exception as e:
        print(f"Error getting processes: {e}")
    
    return processes

def analyze_connection_threat(ip, port):
    """Phân tích mức độ đe dọa của kết nối"""
    suspicious_ports = ['4444', '5555', '6666', '6667', '31337', '12345', '54321', '1337', '8080']
    
    # Check for suspicious ports
    if port in suspicious_ports:
        return "danger"
    
    # Check for private vs public IP
    try:
        ip_clean = ip.strip('[]')
        if not ip_clean.startswith(('10.', '192.168.', '172.')):
            # Public IP - could be suspicious depending on context
            if port in ['443', '80']:
                return "safe"
            else:
                return "warning"
    except:
        pass
    
    return "safe"

def analyze_process_threat(proc):
    """Phân tích mức độ đe dọa của tiến trình"""
    suspicious_names = ['nc.exe', 'ncat.exe', 'netcat.exe', 'mimikatz.exe', 'pwdump.exe']
    suspicious_paths = ['\\Temp\\', '\\AppData\\Local\\Temp\\', '\\Downloads\\']
    
    name = proc.get("name", "").lower()
    path = proc.get("path", "").lower()
    
    # Check for known malicious process names
    for sus_name in suspicious_names:
        if sus_name.lower() in name:
            return "danger"
    
    # Check for suspicious paths
    for sus_path in suspicious_paths:
        if sus_path.lower() in path:
            return "warning"
    
    return "safe"

def analyze_with_gemini(data):
    """Gửi dữ liệu lên Gemini AI để phân tích"""
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=GEMINI_API_KEY)
        
        system_instruction = """
Bạn là chuyên gia bảo mật mạng. Phân tích dữ liệu hệ thống và trả về JSON với format sau:
{
    "risk_level": "safe|warning|danger|critical",
    "summary": "Tóm tắt ngắn gọn (1-2 câu)",
    "threats": [
        {
            "type": "process|connection|file",
            "name": "Tên mối đe dọa",
            "description": "Mô tả chi tiết",
            "action": "Hành động đề xuất",
            "severity": "low|medium|high|critical",
            "target": "PID hoặc IP cần xử lý"
        }
    ],
    "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
}
CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC.
"""
        
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=system_instruction
        )
        
        prompt = f"""Phân tích dữ liệu hệ thống Windows sau và tìm dấu hiệu botnet/malware:

KẾT NỐI MẠNG:
{json.dumps(data.get('connections', [])[:20], indent=2, ensure_ascii=False)}

TIẾN TRÌNH:
{json.dumps(data.get('processes', [])[:30], indent=2, ensure_ascii=False)}

Trả về JSON phân tích."""
        
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Extract JSON from response
        if response_text.startswith('```'):
            response_text = re.sub(r'^```json?\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
        
        return json.loads(response_text)
    except Exception as e:
        print(f"Gemini API error: {e}")
        return {
            "risk_level": "warning",
            "summary": f"Không thể kết nối Gemini AI: {str(e)}",
            "threats": [],
            "recommendations": ["Kiểm tra API key", "Thử lại sau"]
        }

# ========== API ROUTES ==========

@app.route('/')
def index():
    """Trang chủ dashboard"""
    return render_template('index.html')

@app.route('/api/scan', methods=['POST'])
def start_scan():
    """Bắt đầu quét hệ thống"""
    global scan_results
    
    scan_results["status"] = "scanning"
    scan_results["last_scan"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Get system data
    connections = get_network_connections()
    processes = get_running_processes()
    
    scan_results["connections"] = connections
    scan_results["processes"] = processes
    
    # Count threats
    danger_count = sum(1 for c in connections if c.get("threat_level") == "danger")
    danger_count += sum(1 for p in processes if p.get("threat_level") == "danger")
    
    warning_count = sum(1 for c in connections if c.get("threat_level") == "warning")
    warning_count += sum(1 for p in processes if p.get("threat_level") == "warning")
    
    scan_results["status"] = "completed"
    
    return jsonify({
        "success": True,
        "message": "Quét hoàn tất",
        "stats": {
            "connections": len(connections),
            "processes": len(processes),
            "dangers": danger_count,
            "warnings": warning_count
        }
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_with_ai():
    """Phân tích với Gemini AI"""
    global scan_results
    
    scan_results["status"] = "analyzing"
    
    # Analyze with Gemini
    ai_result = analyze_with_gemini({
        "connections": scan_results["connections"],
        "processes": scan_results["processes"]
    })
    
    scan_results["ai_analysis"] = ai_result
    scan_results["threats"] = ai_result.get("threats", [])
    scan_results["status"] = "completed"
    
    return jsonify({
        "success": True,
        "analysis": ai_result
    })

@app.route('/api/results', methods=['GET'])
def get_results():
    """Lấy kết quả quét"""
    return jsonify(scan_results)

@app.route('/api/kill', methods=['POST'])
def kill_process():
    """Kết thúc tiến trình"""
    data = request.get_json()
    pid = data.get('pid')
    
    if not pid:
        return jsonify({"success": False, "message": "Thiếu PID"}), 400
    
    try:
        result = subprocess.run(
            ['taskkill', '/F', '/PID', str(pid)],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            return jsonify({
                "success": True,
                "message": f"Đã kết thúc tiến trình PID {pid}"
            })
        else:
            return jsonify({
                "success": False,
                "message": f"Không thể kết thúc: {result.stderr}"
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi: {str(e)}"
        }), 500

@app.route('/api/block', methods=['POST'])
def block_ip():
    """Chặn IP bằng Windows Firewall"""
    data = request.get_json()
    ip = data.get('ip')
    
    if not ip:
        return jsonify({"success": False, "message": "Thiếu IP"}), 400
    
    try:
        rule_name = f"Block_{ip.replace('.', '_').replace(':', '_')}"
        
        result = subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'add', 'rule',
            f'name={rule_name}',
            'dir=out',
            'action=block',
            f'remoteip={ip}'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            return jsonify({
                "success": True,
                "message": f"Đã chặn IP {ip}"
            })
        else:
            return jsonify({
                "success": False,
                "message": f"Không thể chặn: {result.stderr}"
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi: {str(e)}"
        }), 500

# ========== MAIN ==========

if __name__ == '__main__':
    import webbrowser
    import threading
    
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║     AUTO CHECK BOTNET - WEB DASHBOARD                                        ║
║     Truy cập: http://localhost:5000                                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # Create templates folder if not exists
    os.makedirs('templates', exist_ok=True)
    
    # Tự động mở trình duyệt sau 1.5 giây
    def mo_trinh_duyet():
        import time
        time.sleep(1.5)
        webbrowser.open('http://localhost:5000')
        print("✅ Đã mở trình duyệt!")
    
    threading.Thread(target=mo_trinh_duyet, daemon=True).start()
    
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
