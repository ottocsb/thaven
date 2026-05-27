mod tray;

use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use image::{codecs::jpeg::JpegEncoder, ImageReader};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PathResult {
    path: String,
    already_exists: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    task_id: String,
    downloaded: u64,
    total: Option<u64>,
    progress: u8,
    path: Option<String>,
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

struct LocalWallpaperFile {
    path: PathBuf,
    filename: String,
    file_size: u64,
    created_at: Option<u64>,
    modified_at: Option<u64>,
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

fn allow_asset_directory(app: &AppHandle, path: &Path) -> Result<(), String> {
    app.asset_protocol_scope()
        .allow_directory(path, true)
        .map_err(|err| format!("允许访问图片目录失败：{err}"))
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

fn thumbnail_cache_path(cache_dir: &Path, source: &Path, modified_at: Option<u64>) -> PathBuf {
    let mut hasher = DefaultHasher::new();
    source.to_string_lossy().hash(&mut hasher);
    modified_at.hash(&mut hasher);

    cache_dir.join(format!("{:x}.jpg", hasher.finish()))
}

fn create_thumbnail(source: &Path, target: &Path) -> Result<(), String> {
    let image = ImageReader::open(source)
        .map_err(|err| format!("读取缩略图源文件失败：{err}"))?
        .decode()
        .map_err(|err| format!("解码缩略图源文件失败：{err}"))?;
    let thumbnail = image.thumbnail(480, 320);
    let mut file = fs::File::create(target).map_err(|err| format!("创建缩略图失败：{err}"))?;
    let mut encoder = JpegEncoder::new_with_quality(&mut file, 82);

    encoder
        .encode_image(&thumbnail)
        .map_err(|err| format!("写入缩略图失败：{err}"))
}

fn emit_download_progress(
    app: &AppHandle,
    task_id: &str,
    downloaded: u64,
    total: Option<u64>,
    progress: u8,
    path: Option<&Path>,
) {
    let _ = app.emit(
        "download://progress",
        DownloadProgress {
            task_id: task_id.to_string(),
            downloaded,
            total,
            progress,
            path: path.map(|value| value.to_string_lossy().into_owned()),
        },
    );
}

#[cfg(test)]
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
        already_exists: false,
    })
}

#[tauri::command]
fn ensure_download_dir(app: AppHandle, directory: Option<String>) -> Result<PathResult, String> {
    let dir = resolve_download_dir(&app, directory.as_deref())?;
    ensure_directory(&dir)?;
    allow_asset_directory(&app, &dir)?;

    Ok(PathResult {
        path: dir.to_string_lossy().into_owned(),
        already_exists: false,
    })
}

#[tauri::command]
async fn generate_local_thumbnail(
    app: AppHandle,
    path: String,
    modified_at: Option<u64>,
) -> Result<PathResult, String> {
    let source = PathBuf::from(path.trim());
    if !source.is_file() {
        return Err("文件不存在".to_string());
    }

    if !is_supported_image(&source) {
        return Err("不支持的图片文件".to_string());
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|err| format!("获取缓存目录失败：{err}"))?
        .join("thumbnails");
    ensure_directory(&cache_dir)?;
    allow_asset_directory(&app, &cache_dir)?;

    let target = thumbnail_cache_path(&cache_dir, &source, modified_at);
    if target.is_file() {
        return Ok(PathResult {
            path: target.to_string_lossy().into_owned(),
            already_exists: true,
        });
    }

    let target_for_task = target.clone();
    tauri::async_runtime::spawn_blocking(move || create_thumbnail(&source, &target_for_task))
        .await
        .map_err(|err| format!("生成缩略图失败：{err}"))??;

    Ok(PathResult {
        path: target.to_string_lossy().into_owned(),
        already_exists: false,
    })
}

#[tauri::command]
async fn download_wallpaper(
    app: AppHandle,
    url: String,
    filename: String,
    directory: Option<String>,
    task_id: String,
) -> Result<PathResult, String> {
    let safe_filename = safe_filename(&filename)?;
    let download_dir = resolve_download_dir(&app, directory.as_deref())?;
    let path = download_dir.join(safe_filename);

    ensure_directory(&download_dir)?;
    allow_asset_directory(&app, &download_dir)?;

    if path.is_file() {
        emit_download_progress(&app, &task_id, 1, Some(1), 100, Some(&path));
        return Ok(PathResult {
            path: path.to_string_lossy().into_owned(),
            already_exists: true,
        });
    }

    let mut response = reqwest::get(&url)
        .await
        .map_err(|err| format!("下载请求失败：{err}"))?;

    if !response.status().is_success() {
        return Err(format!("下载失败：{}", response.status()));
    }

    let total = response.content_length();
    let mut downloaded = 0_u64;
    let mut bytes = Vec::new();
    emit_download_progress(&app, &task_id, downloaded, total, 0, None);

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|err| format!("读取下载内容失败：{err}"))?
    {
        downloaded += chunk.len() as u64;
        bytes.extend_from_slice(&chunk);

        let progress = total
            .filter(|value| *value > 0)
            .map(|value| ((downloaded as f64 / value as f64) * 100.0).round() as u8)
            .unwrap_or(0)
            .min(99);
        emit_download_progress(&app, &task_id, downloaded, total, progress, None);
    }

    fs::write(&path, bytes).map_err(|err| format!("写入文件失败：{err}"))?;
    emit_download_progress(&app, &task_id, downloaded, total, 100, Some(&path));

    Ok(PathResult {
        path: path.to_string_lossy().into_owned(),
        already_exists: false,
    })
}

#[tauri::command]
async fn scan_local_wallpapers(
    directory: String,
    page: Option<usize>,
    page_size: Option<usize>,
    sort_by: Option<String>,
    order: Option<String>,
) -> Result<LocalWallpaperPage, String> {
    tauri::async_runtime::spawn_blocking(move || {
        scan_local_wallpapers_blocking(directory, page, page_size, sort_by, order)
    })
    .await
    .map_err(|err| format!("扫描本地壁纸失败：{err}"))?
}

fn scan_local_wallpapers_blocking(
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

    let mut files = fs::read_dir(&dir)
        .map_err(|err| format!("读取目录失败：{err}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_supported_image(path))
        .filter_map(|path| {
            let metadata = fs::metadata(&path).ok()?;
            let filename = path.file_name()?.to_string_lossy().into_owned();

            Some(LocalWallpaperFile {
                path,
                filename,
                file_size: metadata.len(),
                created_at: system_time_millis(metadata.created()),
                modified_at: system_time_millis(metadata.modified()),
            })
        })
        .collect::<Vec<_>>();

    let sort_by = sort_by.as_deref().unwrap_or("modified");
    files.sort_by_key(|item| match sort_by {
        "created" => item.created_at.unwrap_or(0),
        _ => item.modified_at.unwrap_or(0),
    });

    if order.as_deref() != Some("asc") {
        files.reverse();
    }

    let total = files.len();
    let page_size = page_size.unwrap_or(30).clamp(1, 100);
    let last_page = total.div_ceil(page_size).max(1);
    let current_page = page.unwrap_or(1).clamp(1, last_page);
    let start = (current_page - 1) * page_size;
    let data = files
        .into_iter()
        .skip(start)
        .take(page_size)
        .map(|file| {
            let (width, height) = read_image_dimensions(&file.path);

            LocalWallpaper {
                path: file.path.to_string_lossy().into_owned(),
                filename: file.filename,
                file_size: file.file_size,
                width,
                height,
                created_at: file.created_at,
                modified_at: file.modified_at,
            }
        })
        .collect();

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
fn open_in_file_manager(path: String) -> Result<(), String> {
    let path = PathBuf::from(path.trim());
    if path.as_os_str().is_empty() {
        return Err("路径不能为空".to_string());
    }

    if path.is_dir() {
        open_directory_in_file_manager(&path)
    } else if path.is_file() {
        reveal_file_in_file_manager(&path)
    } else {
        Err("路径不存在".to_string())
    }
}

#[cfg(target_os = "windows")]
fn open_directory_in_file_manager(path: &Path) -> Result<(), String> {
    Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|err| format!("打开目录失败：{err}"))?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn reveal_file_in_file_manager(path: &Path) -> Result<(), String> {
    Command::new("explorer")
        .arg(format!("/select,{}", path.to_string_lossy()))
        .spawn()
        .map_err(|err| format!("显示文件位置失败：{err}"))?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn open_directory_in_file_manager(path: &Path) -> Result<(), String> {
    Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|err| format!("打开目录失败：{err}"))?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn reveal_file_in_file_manager(path: &Path) -> Result<(), String> {
    Command::new("open")
        .args(["-R"])
        .arg(path)
        .spawn()
        .map_err(|err| format!("显示文件位置失败：{err}"))?;

    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn open_directory_in_file_manager(path: &Path) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map_err(|err| format!("打开目录失败：{err}"))?;

    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn reveal_file_in_file_manager(path: &Path) -> Result<(), String> {
    let dir = path.parent().unwrap_or(path);
    open_directory_in_file_manager(dir)
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
            generate_local_thumbnail,
            download_wallpaper,
            scan_local_wallpapers,
            delete_local_wallpaper,
            open_in_file_manager,
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

    #[test]
    fn creates_thumbnail_file() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("source.png");
        let target = dir.path().join("thumb.jpg");
        let image = image::RgbImage::from_pixel(8, 8, image::Rgb([120, 80, 40]));

        image.save(&source).unwrap();
        super::create_thumbnail(&source, &target).unwrap();

        assert!(target.is_file());
        assert!(fs::metadata(target).unwrap().len() > 0);
    }
}
