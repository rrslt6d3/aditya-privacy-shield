// We have temporarily disabled the "Cloak of Invisibility" below.
// This forces Windows to keep the black Command Prompt open alongside your app,
// so if it crashes, the error text has nowhere to hide!
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // This tells the main file to fire up the engine we built in lib.rs
    my_app_lib::run();
}