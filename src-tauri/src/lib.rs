use tauri::Emitter;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};

#[tauri::command]
async fn write_file_bytes(path: String, contents: Vec<u8>) -> Result<(), String> {
  std::fs::write(&path, &contents).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let handle = app.handle();

      #[cfg(target_os = "macos")]
      let app_submenu = SubmenuBuilder::new(handle, "slop-draw")
        .about(None)
        .separator()
        .item(&PredefinedMenuItem::services(handle, None)?)
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

      let export = MenuItemBuilder::new("Export\u{2026}")
        .id("export")
        .accelerator("CmdOrCtrl+Shift+E")
        .build(handle)?;

      let file_submenu = SubmenuBuilder::new(handle, "File")
        .item(&export)
        .separator()
        .close_window()
        .build()?;

      let edit_submenu = SubmenuBuilder::new(handle, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

      let mut builder = MenuBuilder::new(handle);
      #[cfg(target_os = "macos")]
      { builder = builder.item(&app_submenu); }
      let menu = builder
        .item(&file_submenu)
        .item(&edit_submenu)
        .build()?;

      app.set_menu(menu)?;

      app.on_menu_event(move |app, event| {
        if event.id() == "export" {
          let _ = app.emit("menu-export", ());
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![write_file_bytes])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
