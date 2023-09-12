#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::SystemTray;
mod tray;
use tray::{build_tray_menu,handle_tray_event};
fn main() {
	let tray_menu = build_tray_menu();
  let tray = SystemTray::new().with_menu(tray_menu);
  tauri::Builder::default()
	  .system_tray(tray)
		.on_system_tray_event(handle_tray_event)
    .invoke_handler(tauri::generate_handler![greet])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
   format!("Hello, {}!", name)
}