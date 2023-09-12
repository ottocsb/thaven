use tauri::Manager;
use tauri::{CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem ,SystemTrayEvent,AppHandle};
pub fn build_tray_menu()->SystemTrayMenu{
	let quit = CustomMenuItem::new("quit".to_string(), "quit");
  let hide = CustomMenuItem::new("hide".to_string(), "hide");
	let next_item = CustomMenuItem::new("next".to_string(), "next");
	let prev_item = CustomMenuItem::new("prev".to_string(), "prev");
	
	let tray_menu = SystemTrayMenu::new()
	.add_item(prev_item)
	.add_item(next_item)
  .add_native_item(SystemTrayMenuItem::Separator)
	.add_item(quit)
  .add_item(hide);
	tray_menu
}

pub fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
  match event {
		SystemTrayEvent::LeftClick {
			position: _,
			size: _,
			..
		} => {
			app.get_window("main").unwrap().show().unwrap();
			println!("left click");
		}
		SystemTrayEvent::RightClick {
			position: _,
			size: _,
			..
		} => {
			println!("right click");
		}
		SystemTrayEvent::DoubleClick {
			position: _,
			size: _,
			..
		} => {
			println!("double click");
		}
    SystemTrayEvent::MenuItemClick { id, .. } => {
      match id.as_str() {
        "quit" => {
          println!("quit");
          std::process::exit(0);
        }
        "hide" => {
          app.get_window("main").unwrap().hide().unwrap();
					println!("hide");
        }
        "next" => {
          println!("next");
        }
        "prev" => {
          println!("prev");
        }
        _ => {}
      }
    }
    _ => {}
  }
}