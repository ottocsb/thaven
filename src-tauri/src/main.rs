#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::SystemTray;
use winapi::um::winuser::{MessageBoxW, MB_OK};
use std::ptr::null_mut;
use std::os::windows::ffi::{OsStrExt};
mod tray;
use tray::{build_tray_menu,handle_tray_event};
fn main() {
    // hello();
    let tray_menu = build_tray_menu();
    let tray = SystemTray::new().with_menu(tray_menu);
    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(handle_tray_event)
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


// 这是个很丑的提示框
// todo
fn hello () {
    let text = "Hello Rust!";
    let wide: Vec<u16> = std::ffi::OsString::from(text)
        .encode_wide()
        .chain(Some(0).into_iter())
        .collect();
    unsafe {
        MessageBoxW(null_mut(), wide.as_ptr(), wide.as_ptr(), MB_OK);
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    println!("Hello, {}!", name);
    format!("Hello, {}!", name)
}

// 测试用例
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_greet() {
        assert_eq!(greet("world"), "Hello, world!");
    }
    #[test]
    fn test_hello() {
        hello();
    }
}
