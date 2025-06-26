import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

// const API_URL = 'http://localhost:3001/api'
 const API_URL = 'https://whiteboard-backend-1-ynjp.onrender.com/api'
interface CanvasElement {
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  text?: string;
  fontSize?: number;
  id?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  isFilled?: boolean;
}

// Debounce helper
const debounce = <F extends (...args: any[]) => any>(func: F, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<F>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

function App() {
  const [canvasId, setCanvasId] = useState<string>('')
  const [elementType, setElementType] = useState('rectangle')
  const [color, setColor] = useState('#000000')
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(16)
  const [isFilled, setIsFilled] = useState(true)
  const [previewUrl, setPreviewUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedElement, setDraggedElement] = useState<CanvasElement | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [localDragPosition, setLocalDragPosition] = useState({ x: 0, y: 0 })

  // Debounced server update
  const debouncedUpdateElement = useCallback(
    debounce(async (elementData: any) => {
      try {
        await fetch(`${API_URL}/canvas/update-element`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(elementData)
        });
        updatePreview(canvasId);
      } catch (error) {
        console.error('Error updating element position:', error);
      }
    }, 50),
    [canvasId]
  );

  // Auto-initialize canvas on component mount
  useEffect(() => {
    const initCanvas = async () => {
      try {
        // Calculate canvas size based on 83.33% of window width
        const canvasWidth = Math.floor(window.innerWidth * 0.8333)
        const canvasHeight = window.innerHeight

        const response = await fetch(`${API_URL}/canvas/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            width: canvasWidth,
            height: canvasHeight,
            id: Date.now().toString(),
          }),
        })
        const data = await response.json()
        setCanvasId(data.id)
        updatePreview(data.id)
      } catch (error) {
        console.error('Failed to initialize canvas:', error)
      }
    }
    initCanvas()
  }, [])

  const getCanvasCoordinates = (e: React.MouseEvent) => {
    if (!previewRef.current) return { x: 0, y: 0 }
    const rect = previewRef.current.getBoundingClientRect()
    const canvasWidth = Math.floor(window.innerWidth * 0.8333)
    const scaleX = canvasWidth / rect.width
    const scaleY = window.innerHeight / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = async (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e)
    startPosRef.current = coords

    // Check if clicking on an existing element
    try {
      const response = await fetch(`${API_URL}/canvas/element-at`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: canvasId,
          x: coords.x,
          y: coords.y
        })
      })
      const data = await response.json()
      
      if (data.element) {
        setIsDragging(true)
        setDraggedElement(data.element)
        // Calculate offset from element origin to click position
        setDragOffset({
          x: coords.x - data.element.x,
          y: coords.y - data.element.y
        })
        setLocalDragPosition({
          x: data.element.x,
          y: data.element.y
        })
        return
      }
    } catch (error) {
      console.error('Error checking for element:', error)
    }

    if (elementType === 'text') {
      const text = window.prompt('Enter text:')
      if (text) {
        try {
          await fetch(`${API_URL}/canvas/add-element`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: canvasId,
              element: {
                type: 'text',
                x: coords.x,
                y: coords.y,
                text,
                fontSize,
                color
              }
            })
          })
          updatePreview(canvasId)
        } catch (error) {
          console.error('Error adding text:', error)
        }
      }
    } else {
      setIsDrawing(true)
      setCurrentElement({
        type: elementType,
        x: coords.x,
        y: coords.y,
        color,
        isFilled
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing && !isDragging) return
    
    const coords = getCanvasCoordinates(e)
    
    if (isDragging && draggedElement) {
      // Update local position for smooth movement
      const newX = coords.x - dragOffset.x
      const newY = coords.y - dragOffset.y
      setLocalDragPosition({ x: newX, y: newY })

      // Debounced server update
      debouncedUpdateElement({
        id: canvasId,
        elementId: draggedElement.id,
        x: newX,
        y: newY,
        type: draggedElement.type,
        color: draggedElement.color,
        isFilled: draggedElement.isFilled,
        ...(draggedElement.type === 'circle' && { radius: draggedElement.radius }),
        ...(draggedElement.type === 'rectangle' && { 
          width: draggedElement.width,
          height: draggedElement.height
        })
      })
    } else if (isDrawing && currentElement) {
      if (currentElement.type === 'line') {
        setCurrentElement(prev => {
          if (!prev) return null
          return {
            ...prev,
            startX: startPosRef.current.x,
            startY: startPosRef.current.y,
            endX: coords.x,
            endY: coords.y
          }
        })
      } else {
        const width = Math.abs(coords.x - startPosRef.current.x)
        const height = Math.abs(coords.y - startPosRef.current.y)
        const x = Math.min(coords.x, startPosRef.current.x)
        const y = Math.min(coords.y, startPosRef.current.y)
        
        setCurrentElement(prev => {
          if (!prev) return null
          return {
            ...prev,
            x,
            y,
            ...(prev.type === 'rectangle' && { width, height }),
            ...(prev.type === 'circle' && { radius: Math.max(width, height) / 2 })
          }
        })
      }
    }
  }

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (isDragging) {
      // Final update to server with current position
      const coords = getCanvasCoordinates(e)
      const finalX = coords.x - dragOffset.x
      const finalY = coords.y - dragOffset.y

      try {
        await fetch(`${API_URL}/canvas/update-element`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: canvasId,
            elementId: draggedElement!.id,
            x: finalX,
            y: finalY,
            type: draggedElement!.type,
            color: draggedElement!.color,
            isFilled: draggedElement!.isFilled,
            ...(draggedElement!.type === 'circle' && { radius: draggedElement!.radius }),
            ...(draggedElement!.type === 'rectangle' && { 
              width: draggedElement!.width,
              height: draggedElement!.height
            })
          })
        })
        updatePreview(canvasId)
      } catch (error) {
        console.error('Error updating final position:', error)
      }

      setIsDragging(false)
      setDraggedElement(null)
      setDragOffset({ x: 0, y: 0 })
      return
    }

    if (!isDrawing || !currentElement) return
    setIsDrawing(false)

    const coords = getCanvasCoordinates(e)
    let elementToAdd: CanvasElement | null = null

    if (currentElement.type === 'line') {
      elementToAdd = {
        ...currentElement,
        startX: startPosRef.current.x,
        startY: startPosRef.current.y,
        endX: coords.x,
        endY: coords.y
      }
    } else {
      const width = Math.abs(coords.x - startPosRef.current.x)
      const height = Math.abs(coords.y - startPosRef.current.y)
      const x = Math.min(coords.x, startPosRef.current.x)
      const y = Math.min(coords.y, startPosRef.current.y)

      elementToAdd = {
        ...currentElement,
        x,
        y,
        ...(currentElement.type === 'rectangle' && { width, height }),
        ...(currentElement.type === 'circle' && { radius: Math.max(width, height) / 2 }),
        isFilled
      }
    }

    if (elementToAdd) {
      try {
        const response = await fetch(`${API_URL}/canvas/add-element`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: canvasId,
            element: elementToAdd
          }),
        })

        if (!response.ok) throw new Error('Failed to add element')
        updatePreview(canvasId)
      } catch (error) {
        console.error('Error adding element:', error)
      }
    }

    setCurrentElement(null)
  }

  const updatePreview = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/canvas/${id}/preview`)
      if (response.ok) {
        const blob = await response.blob()
        setPreviewUrl(URL.createObjectURL(blob))
      }
    } catch (error) {
      console.error('Failed to update preview:', error)
    }
  }

  const addImage = async () => {
    if (!canvasId || !fileInputRef.current?.files?.[0]) return

    const formData = new FormData()
    formData.append('image', fileInputRef.current.files[0])
    formData.append('id', canvasId)

    const img = new Image()
    const file = fileInputRef.current.files[0]
    const imageUrl = URL.createObjectURL(file)
    
    img.onload = async () => {
      const aspectRatio = img.width / img.height
      const canvasWidth = Math.floor(window.innerWidth * 0.8333)
      let width = canvasWidth
      let height = width / aspectRatio
      
      if (height > window.innerHeight) {
        height = window.innerHeight
        width = height * aspectRatio
      }
      
      const x = (canvasWidth - width) / 2
      const y = (window.innerHeight - height) / 2

      formData.append('x', x.toString())
      formData.append('y', y.toString())
      formData.append('width', width.toString())
      formData.append('height', height.toString())

      try {
        await fetch(`${API_URL}/canvas/image`, {
          method: 'POST',
          body: formData,
        })
        updatePreview(canvasId)
      } catch (error) {
        console.error('Failed to add image:', error)
      }
      
      URL.revokeObjectURL(imageUrl)
    }
    
    img.src = imageUrl
  }

  const exportPDF = async () => {
    if (!canvasId) return;

    try {
      // Show loading state
      const exportButton = document.querySelector('.export-btn') as HTMLButtonElement;
      if (exportButton) {
        exportButton.disabled = true;
        exportButton.textContent = 'Exporting...';
      }

      const response = await fetch(`${API_URL}/canvas/export-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: canvasId }),
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const data = await response.json();
      
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      //link.href = `${API_URL}${data.url}`;
      // Remove /api from the URL since static files are served from root
      const baseUrl = API_URL.replace('/api', '');
      link.href = `${baseUrl}${data.url}`;
      link.download = `canvas-${canvasId}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Reset button state
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.textContent = 'Export as PDF';
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
      
      // Reset button state on error
      const exportButton = document.querySelector('.export-btn') as HTMLButtonElement;
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.textContent = 'Export as PDF';
      }
    }
  };

  const handleUndo = async () => {
    if (!canvasId) return;

    try {
      const response = await fetch(`${API_URL}/canvas/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: canvasId }),
      });

      if (response.ok) {
        updatePreview(canvasId);
      } else {
        console.error('Failed to undo:', await response.text());
      }
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  }

  const getPreviewStyle = useCallback((element: CanvasElement): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      border: element.isFilled ? 'none' : `2px solid ${element.color}`,
      backgroundColor: element.isFilled ? element.color : 'transparent',
      transition: isDragging ? 'none' : 'all 0.1s ease',
      willChange: 'transform'
    };

    // If this is the dragged element, use the local position
    if (isDragging && draggedElement?.id === element.id) {
      return {
        ...baseStyle,
        transform: `translate(${localDragPosition.x}px, ${localDragPosition.y}px)`,
        ...(element.type === 'rectangle' && {
          width: element.width,
          height: element.height
        }),
        ...(element.type === 'circle' && {
          width: element.radius ? element.radius * 2 : 0,
          height: element.radius ? element.radius * 2 : 0,
          borderRadius: '50%'
        })
      };
    }

    switch (element.type) {
      case 'rectangle':
        return {
          ...baseStyle,
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
        };
      case 'circle':
        return {
          ...baseStyle,
          left: element.x,
          top: element.y,
          width: element.radius ? element.radius * 2 : 0,
          height: element.radius ? element.radius * 2 : 0,
          borderRadius: '50%',
        };
      case 'line':
        if (!element.startX || !element.startY || !element.endX || !element.endY) {
          return baseStyle;
        }
        const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
        const length = Math.sqrt(
          Math.pow(element.endX - element.startX, 2) + Math.pow(element.endY - element.startY, 2)
        );
        return {
          ...baseStyle,
          left: element.startX,
          top: element.startY,
          width: length,
          height: 2,
          transform: `rotate(${angle}rad)`,
          transformOrigin: '0 0',
          backgroundColor: element.color,
          border: 'none',
        };
      default:
        return baseStyle;
    }
  }, [isDragging, draggedElement, localDragPosition]);

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="tool-section">
          <h3>Actions</h3>
          <button onClick={handleUndo} className="btn btn-warning w-100">
            Undo
          </button>
        </div>

        <div className="tool-section">
          <h3>Shape</h3>
          <select 
            className="form-select"
            value={elementType}
            onChange={(e) => setElementType(e.target.value)}
          >
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="line">Line</option>
            <option value="text">Text</option>
          </select>
        </div>

        <div className="tool-section">
          <h3>Style</h3>
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="fillToggle"
              checked={isFilled}
              onChange={(e) => setIsFilled(e.target.checked)}
              disabled={elementType === 'line' || elementType === 'text'}
            />
            <label className="form-check-label" htmlFor="fillToggle">
              Fill Shape
            </label>
          </div>
        </div>

        <div className="tool-section">
          <h3>Color</h3>
          <input
            type="color"
            className="form-control form-control-color w-100"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        {elementType === 'text' && (
          <div className="tool-section">
            <h3>Text</h3>
            <input
              className="form-control mb-2"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text"
            />
            <input
              type="number"
              className="form-control mb-2"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              placeholder="Font size"
              min="8"
              max="72"
            />
            <small className="text-muted">Click on canvas to add text</small>
          </div>
        )}

        <div className="tool-section">
          <h3>Image</h3>
          <input
            type="file"
            className="form-control mb-2"
            ref={fileInputRef}
            accept="image/*"
          />
          <button onClick={addImage} className="btn btn-secondary w-100">
            Add Image
          </button>
        </div>

        <div className="tool-section mt-auto">
          <h3>Export</h3>
          <button onClick={exportPDF} className="btn btn-success w-100 export-btn">
            Export as PDF
          </button>
        </div>
      </div>

      <div className="whiteboard">
        {previewUrl && (
          <div 
            ref={previewRef}
            className="preview-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: elementType === 'text' ? 'text' : 'crosshair' }}
          >
            <img
              src={previewUrl}
              alt="Canvas Preview"
              className="canvas-preview"
            />
            {currentElement && elementType !== 'text' && (
              <div
                className="position-absolute"
                style={{
                  ...getPreviewStyle(currentElement)
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
