import { useRef, useCallback } from 'react';
import RoomRect from './RoomRect';

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 720;
const SNAP = 10;

const snap = (v) => Math.round(v / SNAP) * SNAP;

export default function Canvas({ rooms, selectedId, onSelect, onRoomChange }) {
  const svgRef = useRef(null);
  const actionRef = useRef(null);

  const toLogical = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH,
      y: ((clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT,
    };
  }, []);

  const handleDragStart = useCallback((e, roomId) => {
    const room = rooms.find(r => r.id === roomId);
    const { x, y } = toLogical(e.clientX, e.clientY);
    actionRef.current = {
      type: 'drag',
      roomId,
      startX: x,
      startY: y,
      origX: room.geometry?.x ?? 50,
      origY: room.geometry?.y ?? 50,
    };
  }, [rooms, toLogical]);

  const handleResizeStart = useCallback((e, roomId) => {
    const room = rooms.find(r => r.id === roomId);
    const { x, y } = toLogical(e.clientX, e.clientY);
    actionRef.current = {
      type: 'resize',
      roomId,
      startX: x,
      startY: y,
      origWidth: room.geometry?.width ?? 200,
      origHeight: room.geometry?.height ?? 150,
    };
  }, [rooms, toLogical]);

  const handleMouseMove = useCallback((e) => {
    if (!actionRef.current) return;
    const { type, roomId, startX, startY, origX, origY, origWidth, origHeight } = actionRef.current;
    const { x, y } = toLogical(e.clientX, e.clientY);
    const dx = x - startX;
    const dy = y - startY;

    if (type === 'drag') {
        const room = rooms.find(r => r.id === roomId);
        const roomWidth = room.geometry?.width ?? 200;
        const newX = snap(Math.max(0, Math.min(VIEWBOX_WIDTH - roomWidth, origX + dx)));
        const newY = snap(origY + dy);
        onRoomChange(roomId, { geometry: { ...room.geometry, x: newX, y: newY } });
      }

    if (type === 'resize') {
      const room = rooms.find(r => r.id === roomId);
      const newWidth = snap(Math.max(SNAP * 5, origWidth + dx));
      const newHeight = snap(Math.max(SNAP * 5, origHeight + dy));
      onRoomChange(roomId, { geometry: { ...room.geometry, width: newWidth, height: newHeight } });
    }
  }, [rooms, toLogical, onRoomChange]);

  const handleMouseUp = useCallback(() => {
    actionRef.current = null;
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMin meet"
        style={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundColor: '#fafafa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        }}
        onClick={() => onSelect(null)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {rooms.map(room => (
          <RoomRect
            key={room.id}
            room={room}
            isSelected={selectedId === room.id}
            onSelect={onSelect}
            onDragStart={handleDragStart}
            onResizeStart={handleResizeStart}
          />
        ))}
      </svg>
    </div>
  );
}