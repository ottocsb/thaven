use std::os::windows::ffi::OsStrExt;
use std::ptr::null_mut;
use winapi::um::winuser::{MessageBoxW, MB_OK};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    hello();
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// 修复后的提示框函数
fn hello() {
    let message = "Hello Rust!";
    let title = "Tauri App";

    // 转换消息文本为宽字符
    let message_wide: Vec<u16> = std::ffi::OsString::from(message)
        .encode_wide()
        .chain(Some(0))
        .collect();

    // 转换标题文本为宽字符
    let title_wide: Vec<u16> = std::ffi::OsString::from(title)
        .encode_wide()
        .chain(Some(0))
        .collect();

    unsafe {
        MessageBoxW(
            null_mut(),
            message_wide.as_ptr(),  // 消息内容
            title_wide.as_ptr(),    // 窗口标题
            MB_OK
        );
    }
}