mod tray;

use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use image::ImageReader;
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
struct PathResult {
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalWallpaper {
    path: String,
    filename: String,
    file_size: u64,
    width: Option<u32>,
    height: Option<u32>,
    created_at: Option<u64>,
    modified_at: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalWallpaperPage {
    data: Vec<LocalWallpaper>,
    current_page: usize,
    last_page: usize,
    total: usize,
}

fn default_download_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .download_dir()
        .map_err(|_| "无法获取系统下载目录".to_string())?
        .join("thaven"))
}

fn resolve_download_dir(app: &AppHandle, directory: Option<&str>) -> Result<PathBuf, String> {
    match directory.map(str::trim).filter(|value| !value.is_empty()) {
        Some(path) => Ok(PathBuf::from(path)),
        None => default_download_dir(app),
    }
}

fn ensure_directory(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|err| format!("创建目录失败：{err}"))
}

fn safe_filename(filename: &str) -> Result<&str, String> {
    Path::new(filename)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .ok_or_else(|| "文件名无效".to_string())
}

fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            matches!(
                ext.to_ascii_lowercase().as_str(),
                "jpg" | "jpeg" | "png" | "bmp" | "gif" | "webp"
            )
        })
        .unwrap_or(false)
}

fn system_time_millis(value: Result<SystemTime, std::io::Error>) -> Option<u64> {
    value
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
}

fn read_image_dimensions(path: &Path) -> (Option<u32>, Option<u32>) {
    let reader = match ImageReader::open(path) {
        Ok(reader) => reader,
        Err(_) => return (None, None),
    };

    match reader.into_dimensions() {
        Ok((width, height)) => (Some(width), Some(height)),
        Err(_) => (None, None),
    }
}

fn paginate<T>(
    items: Vec<T>,
    page: Option<usize>,
    page_size: Option<usize>,
) -> (Vec<T>, usize, usize, usize) {
    let total = items.len();
    let page_size = page_size.unwrap_or(30).clamp(1, 100);
    let last_page = total.div_ceil(page_size).max(1);
    let current_page = page.unwrap_or(1).clamp(1, last_page);
    let start = (current_page - 1) * page_size;
    let data = items.into_iter().skip(start).take(page_size).collect();

    (data, current_page, last_page, total)
}

#[tauri::command]
fn get_default_download_dir(app: AppHandle) -> Result<PathResult, String> {
    Ok(PathResult {
        path: default_download_dir(&app)?.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn ensure_download_dir(app: AppHandle, directory: Option<String>) -> Result<PathResult, String> {
    let dir = resolve_download_dir(&app, directory.as_deref())?;
    ensure_directory(&dir)?;

    Ok(PathResult {
        path: dir.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
async fn download_wallpaper(
    app: AppHandle,
    url: String,
    filename: String,
    directory: Option<String>,
) -> Result<PathResult, String> {
    let safe_filename = safe_filename(&filename)?;
    let download_dir = resolve_download_dir(&app, directory.as_deref())?;

    ensure_directory(&download_dir)?;

    let response = reqwest::get(&url)
        .await
        .map_err(|err| format!("下载请求失败：{err}"))?;

    if !response.status().is_success() {
        return Err(format!("下载失败：{}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|err| format!("读取下载内容失败：{err}"))?;
    let path = download_dir.join(safe_filename);

    fs::write(&path, bytes).map_err(|err| format!("写入文件失败：{err}"))?;

    Ok(PathResult {
        path: path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn scan_local_wallpapers(
    directory: String,
    page: Option<usize>,
    page_size: Option<usize>,
    sort_by: Option<String>,
    order: Option<String>,
) -> Result<LocalWallpaperPage, String> {
    let dir = PathBuf::from(directory.trim());
    if !dir.is_dir() {
        return Err("目录不存在".to_string());
    }

    let mut wallpapers = fs::read_dir(&dir)
        .map_err(|err| format!("读取目录失败：{err}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_supported_image(path))
        .filter_map(|path| {
            let metadata = fs::metadata(&path).ok()?;
            let filename = path.file_name()?.to_string_lossy().into_owned();
            let (width, height) = read_image_dimensions(&path);

            Some(LocalWallpaper {
                path: path.to_string_lossy().into_owned(),
                filename,
                file_size: metadata.len(),
                width,
                height,
                created_at: system_time_millis(metadata.created()),
                modified_at: system_time_millis(metadata.modified()),
            })
        })
        .collect::<Vec<_>>();

    let sort_by = sort_by.as_deref().unwrap_or("modified");
    wallpapers.sort_by_key(|item| match sort_by {
        "created" => item.created_at.unwrap_or(0),
        _ => item.modified_at.unwrap_or(0),
    });

    if order.as_deref() != Some("asc") {
        wallpapers.reverse();
    }

    let (data, current_page, last_page, total) = paginate(wallpapers, page, page_size);
    Ok(LocalWallpaperPage {
        data,
        current_page,
        last_page,
        total,
    })
}

#[tauri::command]
fn delete_local_wallpaper(path: String) -> Result<(), String> {
    let path = PathBuf::from(path.trim());
    if !path.is_file() {
        return Err("文件不存在".to_string());
    }

    if !is_supported_image(&path) {
        return Err("只能删除支持的图片文件".to_string());
    }

    fs::remove_file(path).map_err(|err| format!("删除文件失败：{err}"))
}

#[tauri::command]
fn set_wallpaper(path: String) -> Result<(), String> {
    let path = PathBuf::from(path.trim());
    if !path.is_file() {
        return Err("壁纸文件不存在".to_string());
    }

    set_wallpaper_for_platform(&path)
}

#[cfg(target_os = "windows")]
fn set_wallpaper_for_platform(path: &Path) -> Result<(), String> {
    let script = r#"
Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class Wallpaper { [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni); }'
if (-not [Wallpaper]::SystemParametersInfo(20, 0, $args[0], 3)) { exit 1 }
"#;

    let status = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .arg(path)
        .status()
        .map_err(|err| format!("设置壁纸失败：{err}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("设置壁纸失败".to_string())
    }
}

#[cfg(target_os = "macos")]
fn set_wallpaper_for_platform(path: &Path) -> Result<(), String> {
    let status = Command::new("osascript")
        .args([
            "-e",
            "on run argv",
            "-e",
            "set imagePath to POSIX file (item 1 of argv)",
            "-e",
            "tell application \"System Events\" to tell every desktop to set picture to imagePath",
            "-e",
            "end run",
        ])
        .arg(path)
        .status()
        .map_err(|err| format!("设置壁纸失败：{err}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("设置壁纸失败".to_string())
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn set_wallpaper_for_platform(_path: &Path) -> Result<(), String> {
    Err("当前系统暂不支持设置壁纸".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tray::init(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_default_download_dir,
            ensure_download_dir,
            download_wallpaper,
            scan_local_wallpapers,
            delete_local_wallpaper,
            set_wallpaper
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{is_supported_image, paginate};
    use std::{fs, path::Path};

    #[test]
    fn filters_supported_image_types() {
        assert!(is_supported_image(Path::new("a.jpg")));
        assert!(is_supported_image(Path::new("a.JPEG")));
        assert!(is_supported_image(Path::new("a.webp")));
        assert!(!is_supported_image(Path::new("a.txt")));
    }

    #[test]
    fn paginates_with_bounds() {
        let (data, current_page, last_page, total) =
            paginate(vec![1, 2, 3, 4, 5], Some(3), Some(2));
        assert_eq!(data, vec![5]);
        assert_eq!(current_page, 3);
        assert_eq!(last_page, 3);
        assert_eq!(total, 5);
    }

    #[test]
    fn create_directory_works() {
        let dir = tempfile::tempdir().unwrap();
        let nested = dir.path().join("a").join("b");
        super::ensure_directory(&nested).unwrap();
        assert!(nested.is_dir());
    }

    #[test]
    fn deleting_missing_file_fails() {
        let dir = tempfile::tempdir().unwrap();
        let err = super::delete_local_wallpaper(
            dir.path()
                .join("missing.jpg")
                .to_string_lossy()
                .into_owned(),
        )
        .unwrap_err();
        assert_eq!(err, "文件不存在");
    }

    #[test]
    fn deleting_image_file_works() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("wallpaper.jpg");
        fs::write(&path, b"test").unwrap();
        super::delete_local_wallpaper(path.to_string_lossy().into_owned()).unwrap();
        assert!(!path.exists());
    }
}
