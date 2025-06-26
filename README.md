# Whiteboard Canvas Application

A real-time collaborative whiteboard application built with React, TypeScript, Node.js, and Express. Draw shapes, add text, and export your designs with ease.

## Features

### Drawing Tools
- **Shapes**: Draw rectangles and circles with fill or outline options
- **Lines**: Create straight lines with customizable colors
- **Text**: Add text with adjustable font size
- **Images**: Upload and place images on the canvas

### Styling Options
- **Colors**: Full color picker for shapes and text
- **Fill/Outline**: Toggle between filled shapes and outlines
- **Font Size**: Adjust text size for better visibility

### Canvas Operations
- **Drag & Drop**: Move elements freely on the canvas
- **Undo**: Revert your last action
- **Export**: Save your work as a PDF
- **Real-time Preview**: See changes instantly as you draw

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Open a new terminal
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start server
node server.js
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Usage Guide

1. **Drawing Shapes**
   - Select shape type from the sidebar
   - Click and drag on canvas to draw
   - Toggle fill/outline using the checkbox
   - Choose colors using the color picker

2. **Adding Text**
   - Select text tool
   - Click on canvas
   - Enter text in the prompt
   - Adjust font size as needed

3. **Working with Images**
   - Click "Add Image" button
   - Select image file
   - Image will be added to canvas

4. **Moving Elements**
   - Click and drag any element to move it
   - Elements can be freely positioned

5. **Exporting Work**
   - Click "Export as PDF" button
   - PDF will be generated and downloaded
   - All elements will be preserved in the export

## Technical Details

### Frontend Stack
- React 18
- TypeScript
- Vite
- Bootstrap 5
- HTML Canvas API

### Backend Stack
- Node.js
- Express
- Canvas API for rendering
- PDFKit for PDF generation

### Key Features Implementation
- Real-time preview using Canvas API
- Optimized drag and drop with debouncing
- PDF export with high-quality rendering
- Image handling with proper scaling
- Undo functionality with state management

## Project Structure
```
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── server.js
│   └── package.json
└── README.md
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React and Node.js
- Uses Canvas API for rendering
- Bootstrap for styling
- PDFKit for PDF generation 