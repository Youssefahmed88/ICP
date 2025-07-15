use ic_cdk::{query, update};
use ic_cdk::api::msg_caller;
use candid::{CandidType, Deserialize, Principal};
use std::{cell::RefCell, collections::HashMap};

#[derive(Clone, Debug, CandidType, Deserialize)]
struct Note {
    title: String,
    content: String,
}

thread_local! {
    static NOTES: RefCell<HashMap<Principal, Vec<Note>>> = RefCell::new(HashMap::new());
}

#[update]
fn add_note(title: String, content: String) -> bool {
    let caller = msg_caller();
    NOTES.with(|notes| {
        let mut map = notes.borrow_mut();
        let user_notes = map.entry(caller).or_insert(Vec::new());
        user_notes.push(Note{title, content});
        true
    })
}

#[query]
fn get_notes() -> Vec<Note> {
    let caller= msg_caller(); 
    NOTES.with(|notes| notes.borrow().get(&caller).cloned().unwrap_or_default())
}

#[query]
fn get_note_by_index(index: usize) -> Option<Note> {
    let caller = msg_caller();
    NOTES.with(|notes|{
        let map = notes.borrow();
        if let Some(user_notes) = map.get(&caller){
            if index < user_notes.len(){
                return Some(user_notes[index].clone());
            }
        }
        None
    })
}


#[update]
fn delete_note(index: usize) -> bool {
    let caller = msg_caller();
    NOTES.with(|notes| {
        let mut map = notes.borrow_mut();
        if let Some(user_notes) = map.get_mut(&caller){
            if index < user_notes.len() {
                user_notes.remove(index);
                return true;
            }
        }
        false
    })
}

#[update]
fn edit_note(index: usize, new_title: String, new_content: String) -> Option<Note> {
    let caller = msg_caller();
    NOTES.with(|notes| {
        let mut map = notes.borrow_mut();
        if let Some(user_notes) = map.get_mut(&caller){
            if index < user_notes.len() {
                user_notes[index].title = new_title;
                user_notes[index].content = new_content;
                return Some(user_notes[index].clone());
            } 
        }
        None
    })
}

// Enable Candid export
ic_cdk::export_candid!();