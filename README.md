# ShopCore - E-Commerce Web Application 🛒

A dynamic, frontend-focused e-commerce web application engineered without a traditional backend. ShopCore utilizes advanced vanilla JavaScript, modern state management, and the Web Storage API to create a seamless, high-performance shopping experience.

## 🚀 Live Demo
https://shop-core-7zqzawbk5-akhilesh418s-projects.vercel.app

## 💡 System Architecture & Features

This project moves beyond static HTML pages by implementing system-level architecture:

* **Mock Database Engine:** Fully functional cart and user session management synchronized across multiple pages using `localStorage` and JSON serialization.
* **Algorithmic Search:** Real-time product filtering using ES6 array methods (`.filter`, `.find`) against the catalog data.
* **Performance Optimization:** 
  * Utilizes `DocumentFragment` for bulk DOM injections, preventing layout thrashing.
  * Implements custom `debounce()` algorithms on all cart and checkout buttons to prevent API spamming and memory leaks.
* **Dynamic UI Hydration:** Shared layouts (Navbar/Footer) are injected asynchronously (`Promise.all`) via the Fetch API, keeping the codebase DRY (Don't Repeat Yourself).
* **Mobile-First UX:** Fully responsive design utilizing Bootstrap 5 Grid and Flexbox, featuring an off-canvas quick-view cart and automatic Dark/Light mode toggles.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, ES6+ Vanilla JavaScript
* **UI Framework:** Bootstrap 5 (CSS & Icons)
* **Build Tool:** Vite & Node.js Environment
* **Data Source:** FakeStore API (RESTful JSON integration)

## ⚙️ Local Development Setup (VS Code)

To run this project locally on your machine, follow these exact steps:

**1. Clone the repository**
Open your terminal and run the following command to download the code:
```bash
git clone [https://github.com/YOUR_USERNAME/ShopCore-Ecommerce.git](https://github.com/YOUR_USERNAME/ShopCore-Ecommerce.git)

## ⚙️ Local Development Setup (VS Code)

To run this project locally on your machine, follow these exact steps:

**1. Clone the repository**
Open your terminal and run the following command to download the code:
`git clone https://github.com/YOUR_USERNAME/ShopCore-Ecommerce.git`

**2. Open the Project in VS Code**
Open VS Code, go to **File > Open Folder**, and select the `ShopCore-Ecommerce` folder you just cloned.

**3. Open the "Run Place" (The Terminal)**
In VS Code, click **Terminal > New Terminal** from the top menu (or press `Ctrl + \`` on Windows / `Cmd + \`` on Mac). A small window will pop up at the bottom of the screen.

**4. Install Dependencies**
Because you just cloned the code, you must download the project's tools (like Vite and Bootstrap). In the terminal, type the following command and press **Enter**:
`npm install`

**5. Run the Local Server**
Once the installation finishes, start the development server by typing this in the terminal and pressing **Enter**:
`npm run dev`

**6. Open the Live Website**
The terminal will print out a local link (usually `http://localhost:5173/`). Hold the **Ctrl** key (or **Cmd** on Mac) on your keyboard and click that link to instantly open ShopCore in your web browser!
