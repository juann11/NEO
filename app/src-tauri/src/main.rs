// NEO runs without a console window: NEO is the whole UI.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    neo_lib::run()
}
