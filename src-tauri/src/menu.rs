use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::Emitter;

pub fn build_menu(app: &tauri::App) -> tauri::Result<()> {
    let handle = app.handle().clone();

    #[cfg(target_os = "macos")]
    let app_submenu = SubmenuBuilder::new(&handle, "slop-draw")
        .about(None)
        .separator()
        .item(&PredefinedMenuItem::services(&handle, None)?)
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
        .build(&handle)?;

    let file_submenu = SubmenuBuilder::new(&handle, "File")
        .item(&export)
        .separator()
        .close_window()
        .build()?;

    let edit_submenu = SubmenuBuilder::new(&handle, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let mut builder = MenuBuilder::new(&handle);
    #[cfg(target_os = "macos")]
    {
        builder = builder.item(&app_submenu);
    }
    let menu = builder.item(&file_submenu).item(&edit_submenu).build()?;

    app.set_menu(menu)?;

    app.on_menu_event(move |app, event| {
        if event.id() == "export" {
            let _ = app.emit("menu-export", ());
        }
    });

    Ok(())
}
