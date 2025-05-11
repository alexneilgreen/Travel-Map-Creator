// Update the App.jsx to hide map controls and add map shape options with resolution settings

import React, { useState, useEffect, useRef } from "react";
import {
	MapContainer,
	TileLayer,
	Marker,
	Polyline,
	useMap,
} from "react-leaflet";
import L from "leaflet";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import axios from "axios";
import html2canvas from "html2canvas";
import "./App.css";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
	iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
	shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom marker icon
const createMarkerIcon = (color) =>
	new L.Icon({
		iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
		iconRetinaUrl:
			"https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
		shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41],
		className: "marker-icon",
		iconColor: color,
	});

// Updated Map Styles
const mapStyles = [
	{
		name: "Street",
		url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	},
	{
		name: "Satellite",
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
		attribution:
			"Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
	},
	{
		name: "Topo",
		url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
		attribution:
			'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
	},
	{
		name: "Midnight",
		url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	},
	{
		name: "Light",
		url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	},
];

// Map shape options
const mapShapes = [
	{ name: "16:9", aspectRatio: "16/9" },
	{ name: "9:16", aspectRatio: "9/16" },
	{ name: "4:3", aspectRatio: "4/3" },
	{ name: "3:4", aspectRatio: "3/4" },
];

function MapBounds({ locations }) {
	const map = useMap();

	useEffect(() => {
		if (locations.length > 0) {
			const bounds = L.latLngBounds(
				locations.map((loc) => [loc.latitude, loc.longitude])
			);
			map.fitBounds(bounds, { padding: [50, 50] });
		}
	}, [locations, map]);

	return null;
}

function App() {
	const [searchInput, setSearchInput] = useState("");
	const [locations, setLocations] = useState([]);
	const [selectedStyle, setSelectedStyle] = useState(0);
	const [journeyTitle, setJourneyTitle] = useState("");
	const [journeyDescription, setJourneyDescription] = useState("");
	const [selectedShape, setSelectedShape] = useState(0); // Default to 16:9
	const [imageWidth, setImageWidth] = useState(1920); // Default resolution width
	const [imageHeight, setImageHeight] = useState(1080); // Default resolution height
	const [searchResults, setSearchResults] = useState([]);
	const mapRef = useRef(null);

	// Update height when width or aspect ratio changes
	useEffect(() => {
		// Calculate height based on selected shape
		if (selectedShape === 0) {
			// 16:9
			setImageHeight(Math.round((imageWidth * 9) / 16));
		} else if (selectedShape === 1) {
			// 9:16
			setImageHeight(Math.round((imageWidth * 16) / 9));
		} else if (selectedShape === 2) {
			// 4:3
			setImageHeight(Math.round((imageWidth * 3) / 4));
		} else if (selectedShape === 3) {
			// 3:4
			setImageHeight(Math.round((imageWidth * 4) / 3));
		}

		// Force map to update its size when shape changes
		setTimeout(() => {
			if (mapRef.current) {
				mapRef.current.invalidateSize();
			}
		}, 100);
	}, [imageWidth, selectedShape]);

	// Get search results for a location
	const searchLocation = async () => {
		if (!searchInput.trim()) return;

		try {
			const response = await axios.get(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
					searchInput
				)}`
			);
			setSearchResults(response.data.slice(0, 5));
		} catch (error) {
			console.error("Error searching for location:", error);
		}
	};

	// Add a location from search results
	const addLocation = (location) => {
		const newLocation = {
			id: Date.now().toString(),
			name: location.display_name.split(",")[0],
			fullName: location.display_name,
			latitude: parseFloat(location.lat),
			longitude: parseFloat(location.lon),
		};

		setLocations([...locations, newLocation]);
		setSearchInput("");
		setSearchResults([]);
	};

	// Remove a location
	const removeLocation = (id) => {
		setLocations(locations.filter((location) => location.id !== id));
	};

	// Handle reordering locations with drag and drop
	const onDragEnd = (result) => {
		if (!result.destination) return;

		const items = Array.from(locations);
		const [reorderedItem] = items.splice(result.source.index, 1);
		items.splice(result.destination.index, 0, reorderedItem);

		setLocations(items);
	};

	// Updated Download Function
	const downloadMap = () => {
		const mapElement = document.getElementById("map-container");

		// Temporarily hide map controls before capturing
		const mapControls = mapElement.querySelectorAll(
			".leaflet-control-container"
		);
		mapControls.forEach((control) => {
			control.style.display = "none";
		});

		// Temporarily set explicit dimensions for high-resolution export
		mapElement.style.width = `${imageWidth}px`;
		mapElement.style.height = `${imageHeight}px`;

		// Force map to update its size to fill the new dimensions
		if (mapRef.current) {
			mapRef.current.invalidateSize();
		}

		// Wait a moment for the map to update
		setTimeout(() => {
			html2canvas(mapElement, {
				useCORS: true,
				allowTaint: true,
				scrollX: 0,
				scrollY: 0,
				width: imageWidth,
				height: imageHeight,
			}).then((canvas) => {
				const link = document.createElement("a");
				link.download = `${journeyTitle || "My Travel Map"}.png`;
				link.href = canvas.toDataURL("image/png");
				link.click();

				// Restore original dimensions
				mapElement.style.width = `100%`;
				mapElement.style.height = "auto";

				// Restore map controls after capture
				mapControls.forEach((control) => {
					control.style.display = "";
				});

				// Force map to update its size again
				if (mapRef.current) {
					mapRef.current.invalidateSize();
				}
			});
		}, 500); // Half second delay to ensure map updates
	};

	return (
		<div className="app-container">
			<div className="header">
				<h1>Create Your Travel Map</h1>
			</div>

			<div className="main-content">
				<div className="sidebar">
					<section className="section">
						<h2>
							<span className="number">1</span>Add Your Locations
						</h2>
						<p className="hint">
							Use the search bar to add your destinations. Drag and move the
							locations using the handle icon.
						</p>

						<div className="search-container">
							<input
								type="text"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Search for a location"
								className="search-input"
							/>
							<button onClick={searchLocation} className="search-button">
								Search
							</button>
						</div>

						{searchResults.length > 0 && (
							<ul className="search-results">
								{searchResults.map((result) => (
									<li key={result.place_id} onClick={() => addLocation(result)}>
										{result.display_name}
									</li>
								))}
							</ul>
						)}

						<DragDropContext onDragEnd={onDragEnd}>
							<Droppable droppableId="locations">
								{(provided) => (
									<div
										className="location-list"
										{...provided.droppableProps}
										ref={provided.innerRef}
									>
										{locations.map((location, index) => (
											<Draggable
												key={location.id}
												draggableId={location.id}
												index={index}
											>
												{(provided) => (
													<div
														className="location-item"
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
													>
														<div className="location-info">
															<span>≡</span>
															<span>{location.name}</span>
														</div>
														<button
															onClick={() => removeLocation(location.id)}
															className="remove-button"
														>
															✕
														</button>
													</div>
												)}
											</Draggable>
										))}
										{provided.placeholder}
									</div>
								)}
							</Droppable>
						</DragDropContext>
					</section>

					<section className="section">
						<h2>
							<span className="number">2</span>Choose Your Map Style
						</h2>
						<p className="hint">
							Select your preferred map style from the options below.
						</p>

						<div className="map-styles">
							{mapStyles.map((style, index) => (
								<div
									key={index}
									className={`style-option ${
										selectedStyle === index ? "selected" : ""
									}`}
									onClick={() => setSelectedStyle(index)}
								>
									{style.name}
								</div>
							))}
						</div>
					</section>

					<section className="section">
						<h2>
							<span className="number">3</span>Name Your Journey
						</h2>
						<p className="hint">
							Give a memorable title & description to personalize your map.
						</p>

						<div className="input-container">
							<label>Name your journey</label>
							<input
								type="text"
								value={journeyTitle}
								onChange={(e) => setJourneyTitle(e.target.value)}
								placeholder="Summer Roadtrip"
								className="text-input"
							/>
						</div>

						<div className="input-container">
							<label>Add description</label>
							<input
								type="text"
								value={journeyDescription}
								onChange={(e) => setJourneyDescription(e.target.value)}
								placeholder="Our amazing adventure"
								className="text-input"
							/>
						</div>
					</section>

					<section className="section">
						<h2>
							<span className="number">4</span>Choose Map Shape
						</h2>
						<p className="hint">
							Select your map shape and set the export resolution.
						</p>

						<div className="map-styles">
							{mapShapes.map((shape, index) => (
								<div
									key={index}
									className={`shape-option ${
										selectedShape === index ? "selected" : ""
									}`}
									onClick={() => setSelectedShape(index)}
								>
									{shape.name}
								</div>
							))}
						</div>

						<div className="resolution-settings">
							<div className="input-container">
								<label>Width (px)</label>
								<input
									type="number"
									value={imageWidth}
									onChange={(e) =>
										setImageWidth(
											Math.max(100, parseInt(e.target.value) || 100)
										)
									}
									className="text-input"
								/>
							</div>
							<div className="input-container">
								<label>Height (px)</label>
								<input
									type="number"
									value={imageHeight}
									readOnly
									className="text-input readonly"
								/>
							</div>
						</div>
					</section>

					<button onClick={downloadMap} className="download-button">
						Download Map
					</button>
				</div>

				<div className="map-view">
					<p>
						You can zoom in or zoom out the map using the controls or mouse
						wheel.
					</p>

					<div
						id="map-container"
						className="map-container"
						style={{ aspectRatio: mapShapes[selectedShape].aspectRatio }}
					>
						<MapContainer
							center={[20, 0]}
							zoom={2}
							style={{ height: "100%", width: "100%" }}
							ref={mapRef}
							whenReady={() => {
								// Ensure map updates when it's ready
								if (mapRef.current) {
									mapRef.current.invalidateSize();
								}
							}}
						>
							<TileLayer
								url={mapStyles[selectedStyle].url}
								attribution={mapStyles[selectedStyle].attribution}
							/>

							{locations.map((location, index) => (
								<Marker
									key={location.id}
									position={[location.latitude, location.longitude]}
									icon={createMarkerIcon("#00585E")}
								></Marker>
							))}

							{locations.length >= 2 && (
								<Polyline
									positions={locations.map((loc) => [
										loc.latitude,
										loc.longitude,
									])}
									color="#00585E"
									weight={3}
									opacity={0.7}
								/>
							)}

							<MapBounds locations={locations} />
						</MapContainer>

						<div className="map-title-overlay">
							<div className="map-title">
								<div className="title">{journeyTitle || "My Journey"}</div>
								<div className="description">{journeyDescription}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
