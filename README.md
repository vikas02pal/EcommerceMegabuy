# MegaBuy - Ecommerce Website

## How to Start the Server

### Option 1: Simple HTTP Server (Recommended)
1. Open Command Prompt (cmd) or PowerShell
2. Navigate to the project folder:
   
```
   cd c:\Users\vikas\Downloads\vikas project\ecommerce-dsa\backened
   
```
3. Start the server:
   
```
   python -m http.server 8000
   
```
4. Open browser and go to: `http://localhost:8000`

### Option 2: If Docker is installed
1. Open Command Prompt
2. Navigate to the project folder:
   
```
   cd c:\Users\vikas\Downloads\vikas project\ecommerce-dsa\backened
   
```
3. Run:
   
```
   docker-compose up --build
   
```
4. Open browser: `http://localhost:8000`

## Features Added:
- ✅ Search now shows multiple products (minimum 5 items)
- ✅ Search history option added
- ✅ Clear history option available
- ✅ Modern UI with 3-4 pages/sections:
  - Shop (Home)
  - Wishlist
  - Orders
  - Cart

## Project Structure:
- `index.html` - Main frontend
- `script.js` - JavaScript logic
- `styles.css` - Styling
- `backend/` - Node.js backend (optional)
