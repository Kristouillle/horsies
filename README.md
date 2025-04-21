# 🐎 Horse Racing Simulator

A browser-based multiplayer horse racing simulator built with **PixiJS**, **JavaScript**, and eventually **Socket.io**.

---

## 🎮 Gameplay Loop

1. **Create Lobby** – Launch the game server, and a single lobby is created (support for multiple lobbies is planned).
2. **Choose Number of Horses** – User selects how many horses will participate in the race.
3. **Join the Game** – Players connect via their mobile phones using a code or a shared link.
4. **Action Phase (1 minute)** – Players use their limited coins to perform actions like:
   - 🐎 Stim their horse (boost performance with risk of disqualification)
   - ⚠️ Sabotage an opponent's horse (e.g., slow them down)
   - 🔍 View horse odds (each horse has randomized odds)
5. **Race Plays Out** – The animated race is rendered in canvas using PixiJS, based on the internal simulation logic and any in-game actions.
6. **Results** – Winners are announced. Betting mechanics (if any) are handled externally.

---

## ✨ Features

### ✅ Must-Have (MVP)

- [x] Create a single race lobby on game start
- [x] PixiJS-powered race scene using HTML5 canvas
- [x] Simple 2D horses with basic animation or sprites
- [x] UI to select number of horses (e.g., 4–10)
- [ ] Display randomized horse odds
- [x] Basic race simulation logic
- [ ] Race outcome screen

### 💡 Nice-to-Have (Future)

- [x] WebSocket connection via Socket.io for real-time player input
- [x] Player join flow (via mobile)
- [ ] 1-minute countdown action phase
- [ ] Stim and sabotage mechanics (with success/failure logic)
- [x] Add lobby selection: "Create Lobby" / "Join Lobby"
- [ ] Multiple concurrent race lobbies
- [ ] Visual effects for stims, sabotage
- [ ] Leaderboards or player history
- [ ] Enhanced horse animations or art
- [ ] Sound effects and music
- [ ] Funny horses names and sprites

---

## 🛠️ Technologies

| Tech           | Description                           |
| -------------- | ------------------------------------- |
| **PixiJS**     | 2D rendering library for race visuals |
| **JavaScript** | Game logic and interaction            |
| **Socket.io**  | Real-time multiplayer via WebSockets  |
| **HTML/CSS**   | Frontend UI for configuration screens |
| **Spine**      | Bone based animation library          |

---

## 🖼️ Art & Assets

- Simple 2D horses (drawn manually or using basic sprites)
- Background track and finish line
- UI components: lobby selector, countdown timer, action buttons

---

## 🧠 Development Timeline

### Phase 1: MVP (Must-Haves) – **1-2 days**

| Task                                  | Status      |
| ------------------------------------- | ----------- |
| Initialize project & server setup     | ✅ Done |
| Create canvas & setup PixiJS scene    | ✅ Done |
| Draw & animate simple horses          | ⬜️ Pending |
| Add number-of-horses selection screen | ✅ Done |
| Simulate and render race              | 🟨 In the works |
| Display results screen                | ⬜️ Pending |
| Deploy on KSHTech servers             | ⬜️ Pending |

### Phase 2: Make it fun – **Rest of time**

| Task                               | Status      |
| ---------------------------------- | ----------- |
| Setup Socket.io connection         | ✅ Done |
| Allow phone join via lobby code    | 🟨 In the works |
| Multiplayer functionnality         | 🟨 In the works |
| Add stim/sabotage logic            | ⬜️ Pending |
| Mobile responsiveness & UI testing | ⬜️ Pending |

### Phase 3: Polish (the verb not the nationality) – **If we feel like it**

| Task                              | Status      |
| --------------------------------- | ----------- |
| Multiple lobby system             | ⬜️ Pending |
| Enhanced animations & effects     | ⬜️ Pending |
| Lobby/player UI polish            | ⬜️ Pending |
| Visual feedback for stim/sabotage | ⬜️ Pending |

---

## 📂 Project Structure (Planned)
