use tauri::Manager;

#[tauri::command]
fn sanitize_text(input: String) -> Result<String, String> {
    // Professor-level Heuristics: Self-healing regex engine
    // Designed to catch variations (e.g., 'dot' instead of '.')
    let email_pattern = r"(?i)[a-z0-9._%+-]+(@| at )[a-z0-9.-]+(\.| dot )[a-z]{2,}";
    let phone_pattern = r"\b(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b";
    
    let re_email = fancy_regex::Regex::new(email_pattern).map_err(|e| e.to_string())?;
    let re_phone = fancy_regex::Regex::new(phone_pattern).map_err(|e| e.to_string())?;

    let mut result = input;
    result = re_email.replace_all(&result, "[PROTECTED_EMAIL]").to_string();
    result = re_phone.replace_all(&result, "[PROTECTED_PHONE]").to_string();

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![sanitize_text])
        .run(tauri::generate_context!())
        .expect("Self-healing failure: Could not start the engine");
}