# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║     SECURITY LOG AI ANALYST                                                  ║
║     Powered by Google Gemini AI                                              ║
║     Tự động phân tích log bảo mật và phát hiện mối đe dọa                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import glob
import webbrowser
from datetime import datetime

# ========== CONFIGURATION ==========
# API Key của Google Gemini
GEMINI_API_KEY = "AIzaSyCIB9_qc-Y1g_j1YyChb1JOlCLa0HOqyn4"

# Model AI sử dụng (có thể thay đổi nếu cần)
# Thử: gemini-2.5-flash, gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-pro
GEMINI_MODEL = "gemini-2.5-flash"

# Thư mục chứa file log (mặc định là thư mục hiện tại)
LOG_DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Giới hạn kích thước log để tránh timeout (100,000 ký tự)
MAX_LOG_SIZE = 100000

# System Instruction cho AI - YÊU CẦU XUẤT HTML ĐƠN GIẢN TIẾNG VIỆT
SYSTEM_INSTRUCTION = """
Bạn là Chuyên gia An ninh mạng. Phân tích file log bảo mật Windows và tạo trang HTML dashboard ĐƠN GIẢN, DỄ ĐỌC.

NGUYÊN TẮC QUAN TRỌNG:
1. 100% TIẾNG VIỆT - Tất cả text, label, nút bấm đều phải tiếng Việt
2. ĐƠN GIẢN - Chỉ hiển thị thông tin quan trọng, không dài dòng
3. GIẢI THÍCH DÀI → TOOLTIP - Mọi giải thích chi tiết phải giấu trong tooltip (title attribute hoặc popup khi click)
4. NÚT HOẠT ĐỘNG THẬT - Các nút phải có JavaScript thực thi được

THIẾT KẾ HTML:

1. **HEADER ĐƠN GIẢN**:
   - Icon + Tiêu đề "KIỂM TRA BOTNET"
   - Badge trạng thái: 🟢 AN TOÀN hoặc 🔴 NGUY HIỂM

2. **THỐNG KÊ (4 ô vuông)**:
   - Số kết nối mạng
   - Số tiến trình quét
   - Số cảnh báo
   - Số nguy hiểm

3. **DANH SÁCH MỐI ĐE DỌA (nếu có)**:
   Mỗi mục nguy hiểm hiển thị dạng thẻ:
   ```
   🔴 TÊN_MỐI_ĐE_DỌA  [i]  [🗑️ DIỆT NGAY]
        ↳ Thông tin ngắn (IP/PID)
   ```
   - Icon [i] khi hover/click hiện tooltip giải thích chi tiết
   - Nút [DIỆT NGAY] gọi JavaScript để kill process hoặc block IP

4. **KHUYẾN NGHỊ**:
   - Danh sách ngắn gọn các bước cần làm
   - Mỗi mục 1 dòng

JAVASCRIPT BẮT BUỘC (phải hoạt động thật):
```javascript
// Kill process - gọi command taskkill
function dietTienTrinh(pid) {
    if(confirm('Bạn có chắc muốn diệt tiến trình ' + pid + '?')) {
        alert('⚠️ Để diệt tiến trình, chạy lệnh sau với quyền Admin:\\n\\ntaskkill /F /PID ' + pid);
    }
}

// Block IP - gọi netsh firewall
function chanIP(ip) {
    if(confirm('Bạn có chắc muốn chặn IP ' + ip + '?')) {
        alert('⚠️ Để chặn IP, chạy lệnh sau với quyền Admin:\\n\\nnetsh advfirewall firewall add rule name="Block_' + ip + '" dir=out action=block remoteip=' + ip);
    }
}
```

MÀU SẮC:
- Nền tối: #0d1117
- Thẻ nguy hiểm: viền đỏ #ff4444, nền #1a0000
- Thẻ cảnh báo: viền vàng #ffaa00, nền #1a1a00  
- Thẻ an toàn: viền xanh #00ff88, nền #001a0d
- Nút DIỆT: đỏ #dc3545

FORMAT OUTPUT:
- CHỈ xuất HTML thuần túy
- Bắt đầu: <!DOCTYPE html>
- Kết thúc: </html>
- KHÔNG có markdown, KHÔNG giải thích ngoài
"""

# ========== COLOR CODES FOR CONSOLE ==========
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_banner():
    """Hiển thị banner đẹp"""
    print(f"""
{Colors.CYAN}╔══════════════════════════════════════════════════════════════════════════════╗
║{Colors.ENDC}  {Colors.BOLD}{Colors.GREEN}███████╗███████╗ ██████╗██╗   ██╗██████╗ ██╗████████╗██╗   ██╗{Colors.ENDC}            {Colors.CYAN}║
║{Colors.ENDC}  {Colors.BOLD}{Colors.GREEN}██╔════╝██╔════╝██╔════╝██║   ██║██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝{Colors.ENDC}            {Colors.CYAN}║
║{Colors.ENDC}  {Colors.BOLD}{Colors.GREEN}███████╗█████╗  ██║     ██║   ██║██████╔╝██║   ██║    ╚████╔╝ {Colors.ENDC}            {Colors.CYAN}║
║{Colors.ENDC}  {Colors.BOLD}{Colors.GREEN}╚════██║██╔══╝  ██║     ██║   ██║██╔══██╗██║   ██║     ╚██╔╝  {Colors.ENDC}            {Colors.CYAN}║
║{Colors.ENDC}  {Colors.BOLD}{Colors.GREEN}███████║███████╗╚██████╗╚██████╔╝██║  ██║██║   ██║      ██║   {Colors.ENDC}            {Colors.CYAN}║
║{Colors.ENDC}  {Colors.BOLD}{Colors.GREEN}╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝   {Colors.ENDC}            {Colors.CYAN}║
║{Colors.ENDC}                                                                            {Colors.CYAN}║
║{Colors.ENDC}  {Colors.YELLOW}AI-POWERED SECURITY LOG ANALYST{Colors.ENDC}                                         {Colors.CYAN}║
║{Colors.ENDC}  {Colors.BLUE}Powered by Google Gemini {GEMINI_MODEL}{Colors.ENDC}                               {Colors.CYAN}║
║{Colors.ENDC}  {Colors.RED}OUTPUT: HTML DASHBOARD{Colors.ENDC}                                                  {Colors.CYAN}║
╚══════════════════════════════════════════════════════════════════════════════╝{Colors.ENDC}
""")

def find_latest_log_file():
    """Tìm file log mới nhất trong thư mục"""
    # Tìm theo pattern security_check_log_*.txt
    pattern = os.path.join(LOG_DIRECTORY, "security_check_log_*.txt")
    log_files = glob.glob(pattern)
    
    # Cũng tìm file security_check_log.txt (không có timestamp)
    simple_log = os.path.join(LOG_DIRECTORY, "security_check_log.txt")
    if os.path.exists(simple_log):
        log_files.append(simple_log)
    
    if not log_files:
        return None
    
    # Trả về file mới nhất dựa trên thời gian sửa đổi
    return max(log_files, key=os.path.getmtime)

def read_log_file(file_path):
    """Đọc nội dung file log"""
    encodings = ['utf-8', 'utf-16', 'cp1252', 'latin-1']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
                if content:
                    return content
        except (UnicodeDecodeError, UnicodeError):
            continue
        except Exception as e:
            continue
    
    # Fallback: đọc với errors='ignore'
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def analyze_with_gemini(log_content):
    """Gửi log lên Gemini AI để phân tích và tạo HTML"""
    try:
        import google.generativeai as genai
    except ImportError:
        print(f"{Colors.RED}[!] LỖI: Chưa cài đặt thư viện google-generativeai{Colors.ENDC}")
        print(f"{Colors.YELLOW}    Chạy lệnh: pip install google-generativeai{Colors.ENDC}")
        sys.exit(1)
    
    # Cấu hình API
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Tạo model với system instruction
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=SYSTEM_INSTRUCTION
    )
    
    # Tạo prompt phân tích
    prompt = f"""
Dưới đây là nội dung file log chẩn đoán bảo mật Windows. Hãy phân tích kỹ lưỡng và tạo HTML DASHBOARD hoàn chỉnh:

THÔNG TIN HỆ THỐNG:
- Thời gian quét: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- Máy tính được quét

NỘI DUNG LOG:
```
{log_content}
```

TẠO HTML DASHBOARD NGAY BÂY GIỜ. CHỈ XUẤT CODE HTML, KHÔNG CÓ GIẢI THÍCH.
"""
    
    # Gửi request và nhận response
    response = model.generate_content(prompt)
    return response.text

def extract_html(response_text):
    """Trích xuất HTML từ response (loại bỏ markdown nếu có)"""
    text = response_text.strip()
    
    # Nếu response bắt đầu với ```html, loại bỏ markdown
    if text.startswith("```html"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    
    # Loại bỏ ``` ở cuối
    if text.endswith("```"):
        text = text[:-3]
    
    return text.strip()

def main():
    """Hàm chính"""
    # Bật hỗ trợ màu trong Windows Console
    os.system('color')
    
    # Hiển thị banner
    print_banner()
    
    print(f"{Colors.YELLOW}[*] Đang tìm file log bảo mật...{Colors.ENDC}")
    
    # Tìm file log
    log_file = find_latest_log_file()
    
    if not log_file:
        print(f"{Colors.RED}[!] LỖI: Không tìm thấy file log bảo mật!{Colors.ENDC}")
        print(f"{Colors.YELLOW}    Hãy chạy file security_diagnostic.bat trước.{Colors.ENDC}")
        print(f"{Colors.YELLOW}    File log cần có dạng: security_check_log_*.txt{Colors.ENDC}")
        input("\nNhấn Enter để thoát...")
        sys.exit(1)
    
    print(f"{Colors.GREEN}[+] Đã tìm thấy file log: {os.path.basename(log_file)}{Colors.ENDC}")
    
    # Đọc nội dung log
    print(f"{Colors.YELLOW}[*] Đang đọc nội dung file log...{Colors.ENDC}")
    
    try:
        log_content = read_log_file(log_file)
        if not log_content or len(log_content.strip()) == 0:
            print(f"{Colors.RED}[!] LỖI: File log rỗng!{Colors.ENDC}")
            input("\nNhấn Enter để thoát...")
            sys.exit(1)
        
        log_size = len(log_content)
        print(f"{Colors.GREEN}[+] Đã đọc {log_size:,} ký tự từ file log{Colors.ENDC}")
        
        # Cắt bớt log nếu quá dài
        if log_size > MAX_LOG_SIZE:
            print(f"{Colors.YELLOW}[!] File log quá lớn, đang cắt bớt xuống {MAX_LOG_SIZE:,} ký tự...{Colors.ENDC}")
            log_content = log_content[:MAX_LOG_SIZE] + "\n\n[... LOG TRUNCATED DUE TO SIZE ...]"
        
    except FileNotFoundError:
        print(f"{Colors.RED}[!] LỖI: Không tìm thấy file: {log_file}{Colors.ENDC}")
        input("\nNhấn Enter để thoát...")
        sys.exit(1)
    except PermissionError:
        print(f"{Colors.RED}[!] LỖI: Không có quyền đọc file: {log_file}{Colors.ENDC}")
        input("\nNhấn Enter để thoát...")
        sys.exit(1)
    except Exception as e:
        print(f"{Colors.RED}[!] LỖI khi đọc file: {str(e)}{Colors.ENDC}")
        input("\nNhấn Enter để thoát...")
        sys.exit(1)
    
    # Gửi lên Gemini phân tích
    print(f"\n{Colors.CYAN}{'='*80}{Colors.ENDC}")
    print(f"{Colors.YELLOW}[*] Đang gửi log lên Gemini AI để phân tích...{Colors.ENDC}")
    print(f"{Colors.YELLOW}    Model: {GEMINI_MODEL}{Colors.ENDC}")
    print(f"{Colors.YELLOW}    Output: HTML Dashboard{Colors.ENDC}")
    print(f"{Colors.YELLOW}    Vui lòng đợi, quá trình này có thể mất 30-90 giây...{Colors.ENDC}")
    print(f"{Colors.CYAN}{'='*80}{Colors.ENDC}\n")
    
    try:
        analysis_result = analyze_with_gemini(log_content)
        
        # Trích xuất HTML
        html_content = extract_html(analysis_result)
        
        # Lưu file HTML
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_file = os.path.join(LOG_DIRECTORY, f"security_dashboard_{timestamp}.html")
        
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"\n{Colors.GREEN}{'='*80}{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.GREEN}                    PHÂN TÍCH HOÀN TẤT!{Colors.ENDC}")
        print(f"{Colors.GREEN}{'='*80}{Colors.ENDC}")
        
        print(f"\n{Colors.GREEN}[+] Dashboard HTML đã được tạo: {os.path.basename(html_file)}{Colors.ENDC}")
        print(f"{Colors.CYAN}[*] Đang mở dashboard trong trình duyệt...{Colors.ENDC}")
        
        # Mở file HTML trong trình duyệt
        webbrowser.open('file://' + os.path.abspath(html_file))
        
        print(f"\n{Colors.GREEN}[✓] Dashboard đã mở trong trình duyệt mặc định!{Colors.ENDC}")
        
    except Exception as e:
        error_msg = str(e)
        
        if "API_KEY" in error_msg.upper() or "INVALID" in error_msg.upper() or "401" in error_msg:
            print(f"{Colors.RED}[!] LỖI API KEY: API Key không hợp lệ hoặc đã hết hạn!{Colors.ENDC}")
            print(f"{Colors.YELLOW}    Vui lòng kiểm tra lại API Key trong file scan_analyst.py{Colors.ENDC}")
        elif "QUOTA" in error_msg.upper() or "429" in error_msg:
            print(f"{Colors.RED}[!] LỖI: Đã vượt quá giới hạn request API!{Colors.ENDC}")
            print(f"{Colors.YELLOW}    Vui lòng đợi một lúc rồi thử lại.{Colors.ENDC}")
        elif "MODEL" in error_msg.upper() or "404" in error_msg:
            print(f"{Colors.RED}[!] LỖI: Model '{GEMINI_MODEL}' không tồn tại hoặc không khả dụng!{Colors.ENDC}")
            print(f"{Colors.YELLOW}    Thử đổi sang model khác như: gemini-1.5-flash, gemini-1.5-pro{Colors.ENDC}")
        else:
            print(f"{Colors.RED}[!] LỖI khi gọi Gemini API: {error_msg}{Colors.ENDC}")
        
        input("\nNhấn Enter để thoát...")
        sys.exit(1)
    
    input("\nNhấn Enter để thoát...")

if __name__ == "__main__":
    main()
