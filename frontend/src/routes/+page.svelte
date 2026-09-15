<script lang="ts">
	import { onMount } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface ProvinceItem {
		id: string;
		name: string;
		color: string;
		capital: string;
		center: [number, number];
	}

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | null = null;
	let mapLoaded = $state(false);

	let provinces = $state<ProvinceItem[]>([]);
	let selectedIds = $state<Set<string>>(new Set());
	let activeProvince = $state<ProvinceItem | null>(null);
	let statusText = $state('Memuat peta wilayah kerja...');
	let hoveredProvinceId = $state<string | null>(null);

	const initialCenter: [number, number] = [101.5, 0.5]; // Central Sumatra view
	const initialZoom = 5.8;

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
			center: initialCenter,
			zoom: initialZoom,
			pitch: 15
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');

		map.on('load', async () => {
			statusText = 'Mengambil data resmi batas wilayah dari Elysia API...';
			try {
				const response = await fetch('http://localhost:3001/api/provinces');
				const geojson = await response.json();

				provinces = geojson.features.map((f: any) => f.properties);
				selectedIds = new Set(provinces.map((p) => p.id));
				statusText = `8 Wilayah Kerja (Resmi KPU/BIG)`;

				// Add GeoJSON Source
				map?.addSource('provinces-source', {
					type: 'geojson',
					data: geojson
				});

				// Polygon Fill Layer
				map?.addLayer({
					id: 'provinces-fill',
					type: 'fill',
					source: 'provinces-source',
					paint: {
						'fill-color': ['get', 'color'],
						'fill-opacity': [
							'case',
							['boolean', ['feature-state', 'hover'], false],
							0.7,
							0.45
						]
					}
				});

				// Polygon Border Outline Layer
				map?.addLayer({
					id: 'provinces-outline',
					type: 'line',
					source: 'provinces-source',
					paint: {
						'line-color': ['get', 'color'],
						'line-width': 2.2,
						'line-opacity': 0.95
					}
				});

				// Text Label Layer
				map?.addLayer({
					id: 'provinces-label',
					type: 'symbol',
					source: 'provinces-source',
					layout: {
						'text-field': ['get', 'name'],
						'text-size': 12,
						'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
						'text-anchor': 'center'
					},
					paint: {
						'text-color': '#FFFFFF',
						'text-halo-color': '#0F172A',
						'text-halo-width': 2.5
					}
				});

				mapLoaded = true;
				updateMapFilter();

				// Hover interactivity
				let hoveredId: string | number | null = null;
				map?.on('mousemove', 'provinces-fill', (e) => {
					if (!map || !e.features || e.features.length === 0) return;
					map.getCanvas().style.cursor = 'pointer';

					if (hoveredId !== null) {
						map.setFeatureState({ source: 'provinces-source', id: hoveredId }, { hover: false });
					}
					hoveredId = e.features[0].id || e.features[0].properties.id;
					if (hoveredId !== null) {
						map.setFeatureState({ source: 'provinces-source', id: hoveredId }, { hover: true });
					}
				});

				map?.on('mouseleave', 'provinces-fill', () => {
					if (!map) return;
					map.getCanvas().style.cursor = '';
					if (hoveredId !== null) {
						map.setFeatureState({ source: 'provinces-source', id: hoveredId }, { hover: false });
					}
					hoveredId = null;
				});

				// Click interaction
				map?.on('click', 'provinces-fill', (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
					if (!e.features || e.features.length === 0) return;
					const feature = e.features[0];
					const prop = feature.properties as ProvinceItem;
					
					activeProvince = prop;
					if (prop.center) {
						map?.flyTo({
							center: prop.center,
							zoom: 7,
							speed: 1.2
						});
					}
				});
			} catch (err) {
				console.error(err);
				statusText = 'Gagal memuat API Elysia (:3001)';
			}
		});

		return () => {
			map?.remove();
		};
	});

	function updateMapFilter() {
		if (!map || !mapLoaded) return;
		const idsArray = Array.from(selectedIds);
		const filterExpression: maplibregl.FilterSpecification = ['in', ['get', 'id'], ['literal', idsArray]];
		
		map.setFilter('provinces-fill', filterExpression);
		map.setFilter('provinces-outline', filterExpression);
		map.setFilter('provinces-label', filterExpression);
	}

	function toggleProvince(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds = next;
		updateMapFilter();
	}

	function selectAll() {
		selectedIds = new Set(provinces.map((p) => p.id));
		updateMapFilter();
	}

	function deselectAll() {
		selectedIds = new Set();
		updateMapFilter();
	}

	function focusProvince(p: ProvinceItem) {
		activeProvince = p;
		if (!selectedIds.has(p.id)) {
			toggleProvince(p.id);
		}
		map?.flyTo({
			center: p.center,
			zoom: 7,
			speed: 1.2
		});
	}

	function resetView() {
		map?.flyTo({ center: initialCenter, zoom: initialZoom, pitch: 0 });
		activeProvince = null;
	}
</script>

<div class="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
	<!-- Map Canvas -->
	<div bind:this={mapContainer} class="h-full w-full"></div>

	<!-- Sidebar: Daftar Wilayah Kerja Panel -->
	<div class="absolute top-4 left-4 z-10 w-80 max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl">
		<div class="flex items-center justify-between border-b border-slate-800 pb-3">
			<div class="flex items-center space-x-2">
				<div class="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"></div>
				<h1 class="text-base font-bold text-white tracking-wide">Daftar Wilayah Kerja</h1>
			</div>
			<span class="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-cyan-400 border border-slate-700">
				{selectedIds.size} / {provinces.length}
			</span>
		</div>

		<p class="mt-2 text-xs text-slate-400 leading-relaxed">
			Batas wilayah administratif resmi untuk 8 provinsi wilayah kerja. Centang untuk menampilkan pewarnaan presisi pada peta.
		</p>

		<!-- Action Buttons -->
		<div class="mt-3 flex space-x-2 text-xs">
			<button
				onclick={selectAll}
				class="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-1.5 font-medium text-slate-200 transition-colors"
			>
				Pilih Semua
			</button>
			<button
				onclick={deselectAll}
				class="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-1.5 font-medium text-slate-400 hover:text-slate-200 transition-colors"
			>
				Hapus Semua
			</button>
		</div>

		<!-- Checkbox List of 8 Provinces -->
		<div class="mt-4 space-y-2">
			{#each provinces as p (p.id)}
				<div
					class="group flex items-center justify-between rounded-xl border p-2.5 transition-all duration-200 cursor-pointer {selectedIds.has(p.id) ? 'border-slate-700 bg-slate-800/60' : 'border-slate-800/50 bg-slate-950/40 opacity-60 hover:opacity-100'}"
				>
					<label class="flex items-center space-x-3 cursor-pointer select-none flex-1">
						<input
							type="checkbox"
							checked={selectedIds.has(p.id)}
							onchange={() => toggleProvince(p.id)}
							class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
						/>
						
						<!-- Color Badge -->
						<span
							class="h-3.5 w-3.5 rounded-full border border-white/20 shadow-sm flex-shrink-0"
							style="background-color: {p.color};"
						></span>

						<span class="text-xs font-semibold text-slate-200 group-hover:text-white">
							{p.name}
						</span>
					</label>

					<button
						onclick={() => focusProvince(p)}
						title="Fokus Lokasi"
						class="text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 px-2 py-1 rounded border border-cyan-800/60 transition-colors ml-2 font-medium"
					>
						Fokus
					</button>
				</div>
			{/each}
		</div>

		<!-- Status Readout -->
		<div class="mt-4 border-t border-slate-800/80 pt-3 flex items-center justify-between text-[11px] text-slate-400">
			<span>GeoJSON Status:</span>
			<span class="font-mono text-emerald-400 truncate max-w-[170px]">{statusText}</span>
		</div>
	</div>

	<!-- Detail Floating Card for Active Selected Province -->
	{#if activeProvince}
		<div class="absolute bottom-6 right-6 z-10 w-72 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-2">
					<span
						class="h-3.5 w-3.5 rounded-full shadow-sm"
						style="background-color: {activeProvince.color};"
					></span>
					<h2 class="text-sm font-bold text-white">{activeProvince.name}</h2>
				</div>
				<button onclick={() => (activeProvince = null)} class="text-slate-400 hover:text-white text-xs font-bold">✕</button>
			</div>

			<div class="mt-2 text-xs space-y-1 text-slate-300">
				<div>Ibu Kota: <span class="font-semibold text-white">{activeProvince.capital}</span></div>
				<div class="font-mono text-[11px] text-slate-400">
					Koordinat: [{activeProvince.center[0]}, {activeProvince.center[1]}]
				</div>
			</div>

			<button
				onclick={resetView}
				class="mt-3 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-semibold text-slate-200 transition-colors border border-slate-700"
			>
				Reset Tampilan Peta
			</button>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
</style>
