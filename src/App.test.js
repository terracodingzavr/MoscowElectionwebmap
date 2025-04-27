import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import maplibregl from "maplibre-gl";
import Slider from "react-slider";

function App() {
  const [year, setYear] = useState(2012);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Инициализация карты
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [37.6173, 55.7558],
      zoom: 9,
    });

    return () => {
      mapRef.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const sourceId = "elections";

    // Удаляем старый слой
    if (mapRef.current.getSource(sourceId)) {
      if (mapRef.current.getLayer("election-layer")) {
        mapRef.current.removeLayer("election-layer");
      }
      mapRef.current.removeSource(sourceId);
    }

    // Добавляем новый слой
    mapRef.current.addSource(sourceId, {
      type: "geojson",
      data: `https://example.com/elections-${year}.geojson`, // Заменить позже!
    });

    mapRef.current.addLayer({
      id: "election-layer",
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#007bff",
        "fill-opacity": 0.4,
      },
    });
  }, [year]);

  return (
    <div className="App">
      <h1>Геопортал: Выборы в Москве</h1>
      <div ref={mapContainer} id="map" />
      <div className="slider-container">
        <label>Год: {year}</label>
        <Slider
          className="slider"
          value={year}
          min={2012}
          max={2022}
          step={1}
          onChange={setYear}
          renderTrack={(props) => <div {...props} className="slider-track" />}
          renderThumb={(props) => <div {...props} className="slider-thumb" />}
        />
      </div>
    </div>
  );
}

export default App;
