import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Slider from "react-slider";
import "./App.css";
import { useMapEvents } from "react-leaflet";


// Эти два блока вынеси вверх файла, вместе с другими константами
const defaultAdvantageSteps = [
  [5, 0.2],
  [10, 0.4],
  [15, 0.6],
  [100, 0.85]
];

const advantageStepsPresident2018 = [
  [40, 0.2],
  [50, 0.4],
  [60, 0.6],
  [100, 0.85]
];


const president2018Colors = {
  Путин: "#0072bc",           // Синий
  Грудинин: "#a50026",         // Тёмно-красный (КПРФ)
  Жириновский: "#00bfff",      // Голубой
  Собчак: "#00ff00",           // Кислотно-зелёный
  Сурайкин: "#d73027",         // Ярко-красный
  Титов: "#70a9d8",            // Светло-серо-голубой
  Явлинский: "#8bc34a"         // Светло-зелёный
};


function ZoomWatcher({ onZoomChange }) {
  useMapEvents({
    zoomend: (e) => {
      const newZoom = e.target.getZoom();
      onZoomChange(newZoom);
    },
  });
  return null;
}
function getWinnersFromGeoJSON(features, prefix = "2013_mer_") {
  const winners = new Set();

  for (const feature of features) {
    const props = feature.properties;
    const scores = {};

    for (const key in props) {
      if (key.startsWith(prefix)) {
        const rawName = key.replace(prefix, "");
		const name = rawName.split("_")[0]; // Берем только фамилию

        if (!/^[А-ЯЁ]/.test(name)) continue;  // добавляем фильтр по заглавной букве
        scores[name] = props[key];
      }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const winner = sorted[0][0];
      winners.add(winner);
    }
  }

  return Array.from(winners);
}


function getAdvantageLevels(features, prefix) {
  const levels = {};

  for (const feature of features) {
    const props = feature.properties;
    const scores = {};

    for (const key in props) {
      if (key.startsWith(prefix)) {
        const rawName = key.replace(prefix, "");
		const name = rawName.split("_")[0]; // Берем только фамилию

        if (!/^[А-ЯЁ]/.test(name)) continue;
        scores[name] = props[key];
      }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length < 2) continue;

    const winner = sorted[0][0];
    const advantage = sorted[0][1] - sorted[1][1];

    let level = 1;
    if (advantage >= 20) level = 4;
    else if (advantage >= 10) level = 3;
    else if (advantage >= 5) level = 2;

    if (!levels[winner] || levels[winner] < level) {
      levels[winner] = level;
    }
  }

  return levels;
}


const presidentTurnoutThresholds = [
  { limit: 50, color: "#e6f4ea" },  // до 50%
  { limit: 60, color: "#a6d9b7" },  // 50-60%
  { limit: 65, color: "#5bbf83" },  // 60-65%
  { limit: 70, color: "#3a9d66" },  // 65-70%
  { limit: 101, color: "#21814f" }, // более 70%
];

const duma2016Colors = {
  "Единая_Россия": "#0072bc",
  "КПРФ": "#d73027",
  "ЛДПР": "#00bfff",
  "Справедливая_Россия": "#f28c28",
  "Яблоко": "#8bc34a",
  // остальные будут серыми автоматически
};



const baseColors = {
  Собянин: "#0072bc",    // синий
  Навальный: "#f28c28",  // оранжевый
  Мельников: "#d73027",  // красный
  Митрохин: "#8bc34a",   // светло-зелёный (как Явлинский)
  Дегтярёв: "#00bfff",   // голубой (как Жириновский)
  Левичев: "#999999"     // серый
};


function shadeColor(hex, alpha) {
  if (!hex) return "#cccccc"; // Защита от undefined

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}


const turnoutThresholds = [
  { limit: 20, color: "#e6f4ea" },
  { limit: 35, color: "#a6d9b7" },
  { limit: 50, color: "#5bbf83" },
  { limit: 65, color: "#3a9d66" },
  { limit: 101, color: "#21814f" }
];

const presidentColors = {
  Путин: "#0072bc",         // как у Собянина — синий
  Зюганов: "#d73027",       // ярко-красный
  Прохоров: "#00ff00",      // кислотно-зелёный
  Жириновский: "#00bfff",   // голубой
  Миронов: "#ffcc00"        // желто-оранжевый
};


const invalidThresholds = [
  { limit: 0.5, color: "#fde8ef" },
  { limit: 1, color: "#fcd2e1" },
  { limit: 1.5, color: "#f7b6cf" },
  { limit: 2, color: "#ef6cae" },
  { limit: 100, color: "#c51b8a" }
];

const electionPrefixes = {
  "Президент": {
    2012: "2012_president_",
    2018: "2018_president_"
  },
  "Мэр": {
    2013: "2013_mer_",
    2018: "2018_mer_"
  },
  "Госдума": {
    2016: "2016_duma_",
    2021: "2021_duma_"
  },
  "Мосгордума": {
    2014: "2014_mosgorduma_",
    2019: "2019_mosgorduma_"
  },
  "Муниципальные": {
    2017: "2017_mun_"
  }
};

function getStyleByDataType(props, dataType, year, activeElectionLevel) {
  const mode = electionPrefixes[activeElectionLevel]?.[year] || "";
  const threshold = activeElectionLevel === "Президент"
  ? presidentTurnoutThresholds
  : turnoutThresholds;
  if (dataType === "Явка") {
    const value = props[`${mode}явка`] || 0;
    const threshold = activeElectionLevel === "Президент"
      ? presidentTurnoutThresholds
      : turnoutThresholds;
    const color = threshold.find(t => value < t.limit)?.color || "#ccc";

    return {
      color: "#000",
      weight: 1,
      fillOpacity: 0.8,
      fillColor: color,
    };
  }

	if (dataType === "Процент испорченных бюллетеней") {
	  const invalidFieldVariants = [
		`${mode}недействительны`,
		`${mode}недействительных`,
		`${mode}недействительные`
	  ];

	
	const invalidField = invalidFieldVariants.find(f => f in props);
	const value = invalidField ? props[invalidField] : 0;
	const fillColor = invalidThresholds.find(t => value < t.limit)?.color || "#ccc";

    return {
      color: "#000",        // граница УИКов/районов — чёрная
      weight: 1,
      fillOpacity: 0.8,
      fillColor: fillColor, // заливка по проценту испорченных бюллетеней
    };
}}

function getWinnerColorByAdvantage(props, year, activeElectionLevel) {
  let candidates = {};
  let colorPalette = {};

  // --- Выбираем кандидатов и палитру ---
  if (activeElectionLevel === "Президент") {
    if (year === 2012) {
      if (props.uik_num) {
        // УИКи: фамилии через парсинг
        for (const key in props) {
          if (key.startsWith("2012_president_")) {
            const rawName = key.replace("2012_president_", "");
            const shortName = rawName.split("_")[0];
            if (/^[А-ЯЁ]/.test(shortName)) {
              candidates[shortName] = props[key];
            }
          }
        }
      } else {
        // Районы: короткие имена
        candidates = {
          Путин: props[`2012_president_Путин`] || 0,
          Зюганов: props[`2012_president_Зюганов`] || 0,
          Прохоров: props[`2012_president_Прохоров`] || 0,
          Жириновский: props[`2012_president_Жириновский`] || 0,
          Миронов: props[`2012_president_Миронов`] || 0,
        };
      }
      colorPalette = presidentColors;
    } 
    else if (year === 2018) {
      if (props.uik_num) {
        for (const key in props) {
          if (key.startsWith("2018_president_")) {
            const rawName = key.replace("2018_president_", "");
            const shortName = rawName.split("_")[0];
            candidates[shortName] = props[key];
          }
        }
      } else {
        candidates = {
          Путин: props[`2018_president_Путин`] || 0,
          Грудинин: props[`2018_president_Грудинин`] || 0,
          Жириновский: props[`2018_president_Жириновский`] || 0,
          Собчак: props[`2018_president_Собчак`] || 0,
          Сурайкин: props[`2018_president_Сурайкин`] || 0,
          Титов: props[`2018_president_Титов`] || 0,
          Явлинский: props[`2018_president_Явлинский`] || 0,
        };
      }
      colorPalette = president2018Colors;
    }
  }
  else if (activeElectionLevel === "Госдума" && year === 2016) {
    // Госдума 2016: списки партий
    for (const key in props) {
      if (key.startsWith("2016_duma_")) {
        const rawName = key.replace("2016_duma_", "");
        const shortName = rawName.split("_")[0];
        if (/^[А-ЯЁ]/.test(shortName)) {
          candidates[shortName] = props[key];
        }
      }
    }
    colorPalette = duma2016Colors;
  }
  else {
    // Мэрские выборы
    candidates = {
      Собянин: props["2013_mer_Собянин"] || 0,
      Навальный: props["2013_mer_Навальный"] || 0,
      Мельников: props["2013_mer_Мельников"] || 0,
    };
    colorPalette = baseColors;
  }

  // --- Определяем победителя ---
  const sorted = Object.entries(candidates).sort((a, b) => b[1] - a[1]);
  console.log("Sorted candidates:", sorted);

  if (sorted.length === 0) {
    return "rgba(204,204,204,0.3)"; // серый полупрозрачный
  }

  const winner = sorted[0][0];
  const advantage = sorted[0][1] - (sorted[1]?.[1] ?? 0);
  const color = colorPalette[winner] || "#cccccc"; // если нет цвета в палитре — серый

  // --- Шаги прозрачности ---
  const steps = (activeElectionLevel === "Президент" && year === 2018)
    ? advantageStepsPresident2018
    : defaultAdvantageSteps;

  const alpha = steps.find(([limit]) => advantage < limit)?.[1] || 1;

  return shadeColor(color, alpha);
}






function App() {
  const [year, setYear] = useState(2012);
  const [geoData, setGeoData] = useState(null);
  const [activeDataType, setActiveDataType] = useState("Победитель");
  const [activeElectionLevel, setActiveElectionLevel] = useState("Госдума");
  const [activeListType, setActiveListType] = useState("Округ");
  const [mapZoom, setMapZoom] = useState(10);
  const showPrecinctLayer = mapZoom > 12;
  const [districtData, setDistrictData] = useState(null);
  const [uikData, setUikData] = useState(null);
  const [legendLevels, setLegendLevels] = useState({});
  const [districtLegendLevels, setDistrictLegendLevels] = useState({});
  const mapRef = useRef();
  const [selectedFeature, setSelectedFeature] = useState(null);


	useEffect(() => {
	  if (year === 2018 && activeElectionLevel === "Президент") {
		  fetch("/data/moscow_2018_president_results.geojson")
			.then(res => res.json())
			.then(data => {
			  setDistrictData(data);
			  const levels = getAdvantageLevels(data.features, "2018_president_");
			  setDistrictLegendLevels(levels);
			});

		  setUikData(null); // В 2018 УИКов в этих данных пока нет
		  setLegendLevels({});
		}

	  if (year === 2013 && activeElectionLevel === "Мэр") {
		fetch("/data/districts_with_2013_mer.geojson")
		  .then(res => res.json())
		  .then(data => {
			setDistrictData(data);
			const levels = getAdvantageLevels(data.features, "2013_mer_");
			setDistrictLegendLevels(levels);
		  });

		fetch("/data/united_uiks_with_final_2013_mer.geojson")
		  .then(res => res.json())
		  .then(data => {
			setUikData(data);
			const levels = getAdvantageLevels(data.features, "2013_mer_");
			setLegendLevels(levels);
		  });
	  }

	  if (year === 2012 && activeElectionLevel === "Президент") {
		fetch("/data/moscow_2012_president_results.geojson")
		  .then(res => res.json())
		  .then(data => {
			setDistrictData(data);
			const levels = getAdvantageLevels(data.features, "2012_president_");
			setDistrictLegendLevels(levels);
		  });
		fetch("/data/uik_results_2012_president.geojson")
		  .then(res => res.json())
		  .then(data => {
			  setUikData(data);
			  const levels = getAdvantageLevels(data.features, "2012_president_");
			  setLegendLevels(levels);
		  });
	  if (year === 2016 && activeElectionLevel === "Госдума" && activeListType === "Список") {
		  fetch("/data/moscow_2016_duma_results.geojson")
			.then(res => res.json())
			.then(data => {
			  setDistrictData(data);
			  const levels = getAdvantageLevels(data.features, "2016_duma_");
			  setDistrictLegendLevels(levels);
			});

		  setLegendLevels({});
		}


	  console.log("DistrictData:", districtData);
	  }
	}, [year, activeElectionLevel]);



const showDistrictLayer = 
  (year === 2013 && activeElectionLevel === "Мэр") || 
  (year === 2012 && activeElectionLevel === "Президент") ||
  (year === 2018 && activeElectionLevel === "Президент") ||
  (year === 2016 && activeElectionLevel === "Госдума" && activeListType === "Список");
  

console.log("Show Precinct Layer:", showPrecinctLayer);
console.log("Show District Layer:", showDistrictLayer);
console.log("uikData loaded:", uikData?.features?.length || 0);

return (
  <div className="App">
    <div className="title-wrapper">
      <div className="title-decorated">
        <h1>Выборы Москвы</h1>
      </div>
    </div>

    {/* Слайдер */}
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

    {/* Карта + панели */}
    <div className="map-wrapper">
      <div className="map-container">
        {/* Верхняя панель */}
        <div className="top-controls">
          {["Явка", "Победитель", "Процент испорченных бюллетеней"].map((label) => (
            <button
              key={label}
              className={activeDataType === label ? "active" : ""}
              onClick={() => setActiveDataType(label)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeElectionLevel === "Госдума" && (
          <div className="center-controls">
            {["Округ", "Список"].map((label) => (
              <button
                key={label}
                className={activeListType === label ? "active" : ""}
                onClick={() => setActiveListType(label)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Боковая панель */}
        <div className="controls">
          {["Госдума", "Мосгордума", "Муниципальные", "Мэр", "Президент"].map((label) => (
            <button
              key={label}
              className={activeElectionLevel === label ? "active" : ""}
              onClick={() => setActiveElectionLevel(label)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Leaflet карта */}
        <MapContainer
          center={[55.7558, 37.6173]}
          zoom={10}
          className="map-container"
          whenCreated={(map) => {
            mapRef.current = map;
            map.on("zoomend", () => {
              const zoom = map.getZoom();
              setMapZoom(zoom);
              console.log("Zoom now:", zoom);
            });
          }}
        >


				{selectedFeature && (
				  <div className="info-panel">
					<button className="close-btn" onClick={() => setSelectedFeature(null)}>×</button>
					<h4>
					  {selectedFeature.properties.name ||
					   (selectedFeature.properties.uik_num ? `УИК №${selectedFeature.properties.uik_num}` : "Участок")}
					</h4>

					{Object.entries(selectedFeature.properties)
					  .filter(([key]) => {
						const prefix = electionPrefixes[activeElectionLevel]?.[year] || "";
						return key.startsWith(prefix) && /^[А-ЯЁ]/.test(key.replace(prefix, ""));
					  })
					  .sort((a, b) => b[1] - a[1])
					  .map(([key, value]) => {
						const prefix = electionPrefixes[activeElectionLevel]?.[year] || "";
						const rawName = key.replace(prefix, "");
						const name = rawName.split("_")[0]; // Берем только фамилию

						const color = activeElectionLevel === "Президент"
						  ? (year === 2012 ? presidentColors[name] : president2018Colors[name])
						  : baseColors[name];

						const finalColor = color || "#999"; // если цвет не найден


						return (
						  <div key={name} className="bar-row">
							<div className="bar-label">{name}</div>
							<div className="bar-wrapper">
							  <div className="bar-fill" style={{ width: `${value}%`, backgroundColor: color }}></div>
							</div>
							<div className="bar-percent">{value.toFixed(1)}%</div>
						  </div>
						);
					  })}
				  </div>
				)}


			{showDistrictLayer && !showPrecinctLayer && activeDataType === "Победитель" && (
			  <div className="legend-box-horizontal">
				<h4>Преимущество победителя</h4>
				<div className="legend-horizontal">
				  {Object.entries(districtLegendLevels).map(([name, level]) => (
					<div className="legend-candidate" key={name}>
					  {Array.from({ length: level }, (_, i) => {
						const alpha = [0.2, 0.4, 0.6, 0.85][i];
						const labels = (activeElectionLevel === "Президент" && year === 2018)
						  ? ["менее 40", "40–50", "50–60", "более 60"]
						  : ["менее 5", "5–10", "10–20", "более 20"];

						const label = labels[i];
						return (
						  <div key={i} className="legend-entry">
							<div
							  className="legend-color-box"
							  style={{
								backgroundColor: shadeColor(
								  activeElectionLevel === "Президент"
									? presidentColors[name]
									: baseColors[name],
								  alpha
								)
							  }}
							></div>
							<div className="legend-label">{label}%</div>
						  </div>
						);
					  })}
					  <div className="legend-name">{name}</div>
					</div>
				  ))}
				</div>
			  </div>
			)}


			{showPrecinctLayer && activeDataType === "Победитель" && (
			  <div className="legend-box-horizontal">
				<h4>Преимущество победителя</h4>
				<div className="legend-horizontal">
				  {Object.entries(legendLevels).map(([name, level]) => (
					<div className="legend-candidate" key={name}>
					  {Array.from({ length: level }, (_, i) => {
						const alpha = [0.2, 0.4, 0.6, 0.85][i];
						const label = ["менее 5", "5–10", "10–20", "более 20"][i];
						return (
						  <div key={i} className="legend-entry">
							<div
							  className="legend-color-box"
							  style={{
								backgroundColor: shadeColor(
								  activeElectionLevel === "Президент"
									? presidentColors[name]
									: baseColors[name],
								  alpha
								)
							  }}
							></div>
							<div className="legend-label">{label}%</div>
						  </div>
						);
					  })}
					  <div className="legend-name">{name}</div>
					</div>
				  ))}
				</div>
			  </div>
			)}


            <TileLayer
              attribution='Tiles &copy; Esri — Esri, DeLorme, NAVTEQ'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            />
            <ZoomWatcher onZoomChange={setMapZoom} />


			{showDistrictLayer && districtData && !showPrecinctLayer && (
			  <GeoJSON
				key={`district-${year}-${activeElectionLevel}-${activeDataType}-${districtData?.features?.length || 0}`}
				data={districtData}
				style={(feature) => {
				  if (activeDataType === "Победитель") {
					return {
					  color: "#000",
					  weight: 2,
					  fillOpacity: 1,
					  fillColor: getWinnerColorByAdvantage(feature.properties, year, activeElectionLevel),
					};
				  }
				  return getStyleByDataType(feature.properties, activeDataType, year, activeElectionLevel);
				}}
				onEachFeature={(feature, layer) => {
				  layer.on({
					click: () => {
					  if (activeDataType === "Победитель") {
						setSelectedFeature(null);
						setTimeout(() => setSelectedFeature(feature), 0);
					  }
					},
				  });
				}}
			  />
			)}


			{showDistrictLayer && districtData && showPrecinctLayer && (
			  <GeoJSON
				data={districtData}
				style={() => ({
				  color: "#000",
				  weight: 3,
				  fillOpacity: 0,
				  fillColor: "transparent",
				})}
			  />
			)}

			{showPrecinctLayer && uikData && (
			  <GeoJSON
				key={`uiks-${year}-${activeElectionLevel}-${activeDataType}-${uikData?.features?.length || 0}`}
				data={uikData}
				style={(feature) => {
				  if (activeDataType === "Победитель") {
					return {
					  color: "#333",
					  weight: 1,
					  fillOpacity: 1,
					  fillColor: getWinnerColorByAdvantage(feature.properties, year, activeElectionLevel),
					};
				  }
				  return getStyleByDataType(feature.properties, activeDataType, year, activeElectionLevel);
				}}
				onEachFeature={(feature, layer) => {
				  layer.on({
					click: () => {
					  if (activeDataType === "Победитель") {
						setSelectedFeature(null);
						setTimeout(() => setSelectedFeature(feature), 0);
					  }
					},
				  });
				}}
			  />
			)}

			{selectedFeature && (
			  <GeoJSON
				data={{
				  type: "FeatureCollection",
				  features: [JSON.parse(JSON.stringify(selectedFeature))]
				}}
				style={{
				  color: "#ff7800",
				  weight: 3,
				  fillOpacity: 0.2,
				  dashArray: "5, 5"
				}}
			  />
			)}


			{showDistrictLayer && activeDataType === "Явка" && (
			  <div className="legend-box-horizontal">
				<h4>Явка</h4>
				<div className="legend-vertical">
				  {(activeElectionLevel === "Президент"
					? [
						{ color: "#21814f", label: "более 70%" },
						{ color: "#3a9d66", label: "65–70%" },
						{ color: "#5bbf83", label: "60–65%" },
						{ color: "#a6d9b7", label: "50–60%" },
						{ color: "#e6f4ea", label: "менее 50%" }
					  ]
					: [
						{ color: "#21814f", label: "более 65%" },
						{ color: "#3a9d66", label: "50–65%" },
						{ color: "#5bbf83", label: "35–50%" },
						{ color: "#a6d9b7", label: "20–35%" },
						{ color: "#e6f4ea", label: "менее 20%" }
					  ]
				  ).map((item, idx) => (
					<div key={idx} className="legend-entry">
					  <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
					  <div className="legend-label">{item.label}</div>
					</div>
				  ))}
				</div>
			  </div>
			)}


			{showDistrictLayer && activeDataType === "Процент испорченных бюллетеней" && (
			  <div className="legend-box-horizontal">
				<h4>Недействительные бюллетени</h4>
				<div className="legend-vertical">
				  {[
					{ color: "#c51b8a", label: "более 2%" },
					{ color: "#ef6cae", label: "1,5–2%" },
					{ color: "#f7b6cf", label: "1–1,5%" },
					{ color: "#fcd2e1", label: "0,5–1%" },
					{ color: "#fde8ef", label: "менее 0,5%" }
				  ].map((item, idx) => (
					<div key={idx} className="legend-entry">
					  <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
					  <div className="legend-label">{item.label}</div>
					</div>
				  ))}
				</div>
			  </div>
			)}


          </MapContainer>

        </div>
      </div>
    </div>
  );
}

export default App;