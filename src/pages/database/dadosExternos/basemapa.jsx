// ==========================================
// MÓDULO DO MAPA (COM LAMPADA COM STATUS SAP, BADGES E BOTÕES DINÂMICOS)
// Caminho: src\pages\database\dadosExternos\basemapa.jsx
// ==========================================

import Swal from "sweetalert2";

let mapaAtividades = null;
let grupoMarcadores = null;
let routingControl = null;
let pinoDinamoObj = null;
let layerPolylinesRotas = null;

const coresRotas = ['#005596', '#10b981', '#f97316', '#8b5cf6', '#d946ef', '#f43f5e', '#eab308', '#0ea5e9'];

const latDinamo = -1.3366880580803138;
const lngDinamo = -48.44268280463162;

let waypointsAtivos = [];
let idsPesquisadosNoMapa = new Set();

// ==========================================
// CONTROLE DE VISIBILIDADE DO BOTÃO LIMPAR
// ==========================================
function atualizarBotaoLimparMapa() {
    const btn = document.getElementById('btnLimparMapa');
    if (!btn) return;
    if (waypointsAtivos.length > 0 || idsPesquisadosNoMapa.size > 0) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
}

// ==========================================
// DESTRUIÇÃO DO MAPA (PARA EVITAR TELA BRANCA AO REABRIR O MODAL)
// ==========================================
export function destruirMapa() {
    if (mapaAtividades) {
        mapaAtividades.remove();
        mapaAtividades = null;
        grupoMarcadores = null;
        routingControl = null;
        pinoDinamoObj = null;
        layerPolylinesRotas = null;
        waypointsAtivos = [];
        idsPesquisadosNoMapa.clear();
    }
}

// ==========================================
// ESTILOS DINÂMICOS (Injetados via JS)
// ==========================================
const estiloMapaCustom = document.createElement('style');
estiloMapaCustom.innerHTML = `
    .leaflet-routing-container { display: none !important; }
    
    @keyframes blink-destaque {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.1; }
    }
    
    .map-icon-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        background: transparent;
        filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.5));
    }

    .marker-blink {
        animation: blink-destaque 0.8s ease-in-out infinite;
        z-index: 900 !important;
    }

    .marker-na-rota {
        z-index: 1000 !important;
        filter: drop-shadow(0px 0px 6px #10b981) drop-shadow(0px 2px 3px rgba(0,0,0,0.5));
        transform: scale(1.15);
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(estiloMapaCustom);

// ==========================================
// 1. CARREGAMENTO DINÂMICO DE DEPENDÊNCIAS
// ==========================================
export async function carregarDependenciasMapa(callback) {
    if (window.L && window.L.Routing && window.L.markerClusterGroup) {
        if (callback) callback(); return;
    }
    const carregarCSS = (url) => {
        if (!document.querySelector(`link[href*="${url}"]`)) {
            const css = document.createElement('link');
            css.rel = 'stylesheet'; css.href = url; document.head.appendChild(css);
        }
    };
    const carregarJS = (url) => {
        return new Promise((resolve) => {
            if (document.querySelector(`script[src*="${url}"]`)) { resolve(); return; }
            const script = document.createElement('script');
            script.src = url; script.onload = resolve; document.head.appendChild(script);
        });
    };

    carregarCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    carregarCSS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css');
    carregarCSS('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
    
    await carregarJS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    await carregarJS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js');
    await carregarJS('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');

    if (callback) callback();
}

// ==========================================
// 2. INICIALIZAÇÃO DO MAPA E CONTROLES
// ==========================================
function inicializarMapa() {
    if (mapaAtividades) return;

    const container = document.getElementById('mapaCarteiraContainer');
    if(!container) return; 
    container.innerHTML = '';

    mapaAtividades = L.map('mapaCarteiraContainer').setView([latDinamo, lngDinamo], 12); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapaAtividades);

    layerPolylinesRotas = L.layerGroup().addTo(mapaAtividades);

    grupoMarcadores = L.markerClusterGroup({
        maxClusterRadius: 6, 
        disableClusteringAtZoom: 25, 
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster) {
            var count = cluster.getChildCount();
            return L.divIcon({
                html: `<div style="background-color: #005596; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 13px;">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: [36, 36]
            });
        }
    }).addTo(mapaAtividades);

    routingControl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        language: 'pt-BR',
        showAlternatives: false,
        show: false, 
        fitSelectedRoutes: false,
        lineOptions: { styles: [{opacity: 0, weight: 0}] }, 
        createMarker: function() { return null; } 
    }).addTo(mapaAtividades);

    if (!document.getElementById('cardItinerarioRota')) {
        const cardUI = document.createElement('div');
        cardUI.id = 'cardItinerarioRota';
        cardUI.style.cssText = 'position: absolute; top: 15px; right: 15px; z-index: 9999; display: none; width: 280px; pointer-events: auto;';
        document.getElementById('mapaCarteiraContainer').appendChild(cardUI);
    }

    routingControl.on('routesfound', function(e) {
        if (layerPolylinesRotas) layerPolylinesRotas.clearLayers();
        
        const rota = e.routes[0];
        let legDists = [];
        let calcTotal = 0;
        
        if (rota.waypointIndices && rota.waypointIndices.length > 1) {
            for(let i = 0; i < rota.waypointIndices.length - 1; i++) {
                let startIdx = rota.waypointIndices[i];
                let endIdx = rota.waypointIndices[i+1];
                let legCoords = [];
                let distTrecho = 0;
                
                for(let j = startIdx; j <= endIdx; j++) {
                    legCoords.push(rota.coordinates[j]);
                    if (j < endIdx) {
                        distTrecho += rota.coordinates[j].distanceTo(rota.coordinates[j+1]);
                    }
                }
                
                let corLeg = coresRotas[i % coresRotas.length];
                L.polyline(legCoords, { color: corLeg, weight: 6, opacity: 0.85 }).addTo(layerPolylinesRotas);

                let legKm = parseFloat((distTrecho / 1000).toFixed(2));
                legDists.push(legKm);
                calcTotal += legKm; 
            }
        }
        
        const distTotalKm = calcTotal > 0 ? calcTotal.toFixed(2) : (rota.summary.totalDistance / 1000).toFixed(2);

        let html = `
            <div style="padding: 10px; background: white; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); border: 1px solid #cbd5e1; font-family: Arial, sans-serif;">
                <div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <h4 style="margin: 0; color: #005596; font-size: 13px;">Resumo da Rota</h4>
                        <span style="font-size: 11px; background: #e0f2fe; color: #0ea5e9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${distTotalKm} km Total</span>
                    </div>
                    <button id="btnToggleRota" onclick="window.toggleCardRota()" style="background: none; border: none; cursor: pointer; color: #64748b; font-size: 18px; padding: 0 4px; line-height: 1;">−</button>
                </div>
                <ul id="listaRotasItinerario" style="list-style: none; padding: 0; margin: 0; font-size: 11px; color: #334155; max-height: 220px; overflow-y: auto; display: block;">
        `;
        
        for(let i = 0; i < waypointsAtivos.length - 1; i++) {
            let p1 = waypointsAtivos[i];
            let p2 = waypointsAtivos[i+1];
            let kmDoTrecho = legDists[i] ? legDists[i].toFixed(2) : '0.00';
            let corLeg = coresRotas[i % coresRotas.length];
            let linhaServico = p2.servico ? `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">Valor Prev: <strong style="color:#10b981">${p2.servico}</strong></div>` : '';
            
            html += `
                <li style="margin-bottom: 6px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${corLeg};"></div>
                            <strong style="color: #1e293b; font-size: 11px;">Rota ${i+1}:</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #d93025; font-weight: bold; font-size: 11px;">📍 ${kmDoTrecho} km</span>
                            <button onclick="window.excluirPontoRota(${i+1})" title="Excluir este destino" style="background:none; border:none; cursor:pointer; color:#ef4444; padding:0; display:flex; align-items:center;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px; color: #475569;">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p1.nome}">De: <strong style="color:#005596">${p1.nome}</strong></div>
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p2.nome}">Para: <strong style="color:#005596">${p2.nome}</strong></div>${linhaServico}
                    </div>
                </li>
            `;
        }
        
        html += `</ul></div>`;
        const divCard = document.getElementById('cardItinerarioRota');
        if(divCard) {
            divCard.innerHTML = html;
            divCard.style.display = 'block';
        }
    });

    routingControl.on('routingerror', function() {
        if (layerPolylinesRotas) layerPolylinesRotas.clearLayers();
        const divCard = document.getElementById('cardItinerarioRota');
        if(divCard) {
            divCard.innerHTML = '<div style="padding: 10px; font-size: 12px; color: #d93025; background: white; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"><b>Erro:</b> Não foi possível traçar a via.</div>';
            divCard.style.display = 'block';
        }
    });
}

// ==========================================
// 3. CORES E ÍCONES PERSONALIZADOS
// ==========================================
function obterIconeDinamo(numNaRota = null) {
    let badgeHTML = '';
    let wrapperClass = 'custom-dinamo-marker';
    
    if (numNaRota !== null) {
        wrapperClass += ' marker-na-rota';
        badgeHTML = `<div style="position:absolute; top:-8px; right:-8px; background:#10b981; color:white; border-radius:50%; width:18px; height:18px; font-size:11px; font-weight:bold; display:flex; align-items:center; justify-content:center; border:2px solid white; z-index:100; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">${numNaRota}</div>`;
    }

    return L.divIcon({
        className: wrapperClass,
        html: `<div style="position:relative; display:inline-block;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#005596" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.4));"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
            ${badgeHTML}
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [4, 22], 
        popupAnchor: [6, -20]
    });
}

function obterCorPorStatusSap(statusSap) {
    const s = String(statusSap || '').toUpperCase().trim();
    if (['ABER//ABER', 'ABER//ATEC', 'ABER//LOG'].includes(s)) return '#9ca3af';
    if (['LIB//PEND', 'LIB//DFEC', 'LIB//DEV'].includes(s)) return '#f97316';
    if (['LIB//ATEC', 'LIB//LOG'].includes(s)) return '#261ffc';
    if (['LIB//ENER', 'LIB//CONC'].includes(s)) return '#4ade80';
    if (['LIB//COMS', 'LIB//MED'].includes(s)) return '#16a34a';
    return '#d93025'; 
}

function obterIconeDinamicoObra(tipoAtividade, statusSap, isDestaque, numNaRota = null) {
    const tipo = String(tipoAtividade || '').toUpperCase().trim();
    const corPino = obterCorPorStatusSap(statusSap);
    let svgContent = '';
    let size = isDestaque || numNaRota !== null ? "24" : "16"; 
    
    switch(tipo) {
        case 'CLIENTES': 
            svgContent = `<polygon points="12,2 22,20 2,20" fill="${corPino}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>`;
            break;
        case 'EMERGÊNCIA': 
            svgContent = `<g fill="${corPino}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12,2 C7.5,2 4,5.5 4,10 C4,13.5 6.5,16.5 9,17.5 L9,20 C9,20.8 9.8,21.5 10.5,21.5 L13.5,21.5 C14.2,21.5 15,20.8 15,20 L15,17.5 C17.5,16.5 20,13.5 20,10 C20,5.5 16.5,2 12,2 Z" fill="${corPino}" stroke="#ffffff" stroke-width="2"/>
                <rect x="9.5" y="21.5" width="5" height="2" rx="0.5" fill="#64748b" stroke="#ffffff" stroke-width="1"/>
                <line x1="9.5" y1="22.5" x2="14.5" y2="22.5" stroke="#ffffff" stroke-width="0.8"/>
            </g>`;
            break;
        case 'EQUIPAMENTOS': 
            svgContent = `<rect x="4" y="4" width="16" height="16" rx="2" fill="${corPino}" stroke="#ffffff" stroke-width="2"/>`;
            break;
        default: 
            svgContent = `<circle cx="12" cy="12" r="9" fill="${corPino}" stroke="#ffffff" stroke-width="2"/>`;
            break;
    }

    let wrapperClass = 'map-icon-wrapper';
    if (isDestaque) wrapperClass += ' marker-blink';
    
    let badgeHTML = '';
    if (numNaRota !== null) {
        wrapperClass += ' marker-na-rota';
        badgeHTML = `<div style="position:absolute; top:-8px; right:-8px; background:#10b981; color:white; border-radius:50%; width:18px; height:18px; font-size:11px; font-weight:bold; display:flex; align-items:center; justify-content:center; border:2px solid white; z-index:100; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">${numNaRota}</div>`;
    }

    let containerSize = isDestaque || numNaRota !== null ? [26, 26] : [18, 18];
    let anchor = isDestaque || numNaRota !== null ? [13, 13] : [9, 9];

    return L.divIcon({
        className: wrapperClass,
        html: `<div style="position:relative; display:inline-block;">
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="overflow: visible;">${svgContent}</svg>${badgeHTML}
        </div>`,
        iconSize: containerSize,
        iconAnchor: anchor,
        popupAnchor: [0, -12]
    });
}

// ==========================================
// 4. RENDERIZAÇÃO DO MAPA E MARCADORES
// ==========================================
export function atualizarMapaCarteira(listaDados = [], itemFoco = null, manterCamera = false) {
    if (!window.L || !window.L.Routing || !window.L.markerClusterGroup) {
        carregarDependenciasMapa(() => {
            inicializarMapa();
            atualizarMapaCarteira(listaDados, itemFoco, manterCamera);
        });
        return;
    }

    if (!mapaAtividades) inicializarMapa();
    if (!mapaAtividades) return; 
    
    mapaAtividades.invalidateSize();
    
    grupoMarcadores.clearLayers();
    if (pinoDinamoObj) mapaAtividades.removeLayer(pinoDinamoObj);

    const indexDinamoRota = waypointsAtivos.findIndex(wp => wp.latLng.lat === latDinamo && wp.latLng.lng === lngDinamo);
    const numDinamoNaRota = indexDinamoRota !== -1 ? indexDinamoRota + 1 : null;

    const botoesBaseHTML = waypointsAtivos.length === 0 
        ? `<button onclick="window.iniciarRotaDaqui(${latDinamo},${lngDinamo}, 'Base Dínamo', '0')" style="width: 100%; padding: 6px; background: #005596; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">🟢 Partir</button>`
        : `<button onclick="window.adicionarDestino(${latDinamo},${lngDinamo}, 'Base Dínamo', '0')" style="width: 100%; padding: 6px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">➕ Adicionar à rota</button>`;

    pinoDinamoObj = L.marker([latDinamo, lngDinamo], { icon: obterIconeDinamo(numDinamoNaRota), zIndexOffset: 1000 })
        .bindPopup(`
            <div style="font-family: Arial; text-align:left; min-width: 170px;">
                <h4 style="margin: 0 0 4px 0; color: #005596;">BASE DÍNAMO</h4>
                <p style="margin: 0 0 6px 0; font-size:12px; font-weight: bold; color: #475569;">Ponto de Apoio</p>
                <div style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 6px; border-radius: 4px; border-left: 3px solid #0ea5e9; margin-bottom: 8px;">
                    📍 Rod. Augusto Montenegro,<br>KM 8 - Belém/PA
                </div>
                <div style="margin-bottom: 6px;">
                    ${botoesBaseHTML}
                </div>
            </div>
        `)
        .addTo(mapaAtividades);

    const checkboxSelecionado = document.querySelector(".row-checkbox:checked");
    const idSelecionado = checkboxSelecionado ? checkboxSelecionado.value : null;

    let marcadoresAdicionados = 0;
    let latFoco = null, lngFoco = null;

    (listaDados || []).forEach(item => {
        let latStr = item.latitude || item.Latitude || item.lat;
        let lngStr = item.longitude || item.Longitude || item.lng;

        if (latStr !== undefined && lngStr !== undefined && latStr !== null && lngStr !== null) {
            let lat = parseFloat(String(latStr).replace(',', '.'));
            let lng = parseFloat(String(lngStr).replace(',', '.'));

            if (!isNaN(lat) && !isNaN(lng)) {
                const itemId = item.id || item.pep || item.nota;
                const isSelected = (idSelecionado && String(itemId) === String(idSelecionado));
                const isSearched = idsPesquisadosNoMapa.has(String(itemId));
                const isDestaque = isSelected || isSearched;
                
                const indexNaRota = waypointsAtivos.findIndex(wp => wp.latLng.lat === lat && wp.latLng.lng === lng);
                const numNaRota = indexNaRota !== -1 ? indexNaRota + 1 : null;
                
                const tipoAtividade = item.tipo_atividade || item.Tipo_Atividade || item.tipo || "";
                const statusSap = item.status_sap || item.Status_Sap || item.status || "N/A";
                
                const iconeDinamico = obterIconeDinamicoObra(tipoAtividade, statusSap, isDestaque, numNaRota);

                const notaVal = item.nota || "N/A";
                const pepVal = item.pep || "N/A";
                const statusVal = item.status || "N/A";
                
                const valorPrevRaw = item.valor_prev || 0;
                const valorPrevFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(valorPrevRaw));

                const valorProdRaw = item.valor_prod || 0;
                const valorProdFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(valorProdRaw));
                
                const tituloEscapado = String(pepVal).replace(/'/g, "\\'").replace(/"/g, '&quot;'); 
                const valorPrevEscapado = String(valorPrevFmt).replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const urlStreetView = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&radius=5`;
                
                let botoesRotaHTML = '';
                if (waypointsAtivos.length === 0) {
                    botoesRotaHTML = `
                        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                            <button onclick="window.rotaBaseAteAqui(${lat},${lng}, '${tituloEscapado}', '${valorPrevEscapado}')" style="flex: 1; padding: 6px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">📍 Chegar</button>
                            <button onclick="window.iniciarRotaDaqui(${lat},${lng}, '${tituloEscapado}', '${valorPrevEscapado}')" style="flex: 1; padding: 6px; background: #005596; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">🟢 Partir</button>
                        </div>
                    `;
                } else {
                    botoesRotaHTML = `
                        <button onclick="window.adicionarDestino(${lat},${lng}, '${tituloEscapado}', '${valorPrevEscapado}')" style="width: 100%; margin-bottom: 6px; padding: 6px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">➕ Adicionar à rota</button>
                    `;
                }
                
                const popupHTML = `
                    <div style="font-family: Arial, sans-serif; min-width: 190px;">
                        <h4 style="margin: 0 0 5px 0; color: #005596; font-size: 13px;">PEP: ${pepVal}</h4>
                        <p style="margin: 2px 0; font-size: 12px;"><b>Nota:</b> ${notaVal}</p>
                        <p style="margin: 2px 0; font-size: 12px;"><b>Status:</b> ${statusVal}</p>
                        <p style="margin: 2px 0; font-size: 12px;"><b>Status SAP:</b> ${statusSap}</p>
                        <p style="margin: 2px 0; font-size: 12px;"><b>Valor Previsto:</b> ${valorPrevFmt}</p>
                        <p style="margin: 2px 0; font-size: 12px;"><b>Valor Produzido:</b> ${valorProdFmt}</p>
                        
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0;">
                        
                        ${botoesRotaHTML}
                        
                        <a href="${urlStreetView}" target="_blank" style="display: block; width: 100%; padding: 6px; background: #3b82f6; color: white; text-align: center; text-decoration: none; border-radius: 4px; font-size: 12px;">📸 Ver no Street View</a>
                    </div>
                `;

                L.marker([lat, lng], { icon: iconeDinamico }).bindPopup(popupHTML).addTo(grupoMarcadores);
                marcadoresAdicionados++;

                if (itemFoco && String(item.id || item.pep) === String(itemFoco.id || itemFoco.pep)) {
                    latFoco = lat; lngFoco = lng;
                } else if (!itemFoco && isSelected) {
                    latFoco = lat; lngFoco = lng;
                }
            }
        }
    });

    if (!manterCamera) {
        if (latFoco !== null && lngFoco !== null) {
            mapaAtividades.setView([latFoco, lngFoco], 16);
        } else if (marcadoresAdicionados > 0) {
            let limites = grupoMarcadores.getBounds();
            limites.extend([latDinamo, lngDinamo]); 
            mapaAtividades.fitBounds(limites, { padding: [30, 30] });
        } else {
            mapaAtividades.setView([latDinamo, lngDinamo], 12);
        }
    }

    const spanContador = document.getElementById('contadorPontosMapa');
    if (spanContador) {
        spanContador.innerText = `${marcadoresAdicionados} ${marcadoresAdicionados === 1 ? 'ponto' : 'pontos'}`;
    }
}

// ==========================================
// 5. FUNÇÕES GLOBAIS DE INTERAÇÃO E BUSCA
// ==========================================
window.pesquisarNoMapa = function() {
    const input = document.getElementById('inputPesquisaMapa');
    if (!input) return;
    const termo = input.value.trim().toLowerCase();
    if (!termo) return;
    
    const lista = window.listaCarteiraGlobalMapa || [];
    const itemEncontrado = lista.find(i => String(i.pep).toLowerCase() === termo || String(i.nota).toLowerCase() === termo);

    if (itemEncontrado) {
        idsPesquisadosNoMapa.add(String(itemEncontrado.id || itemEncontrado.pep)); 
        atualizarMapaCarteira(lista, itemEncontrado); 
        input.value = ''; 
        atualizarBotaoLimparMapa();
    } else {
        Swal.fire({ icon: 'info', title: 'Não encontrado', text: 'Registro não localizado na base.', confirmButtonColor: '#005596' });
    }
};

window.limparRotaBusca = function() {
    waypointsAtivos = [];
    if (routingControl) routingControl.setWaypoints([]); 
    if (layerPolylinesRotas) layerPolylinesRotas.clearLayers();
    
    const divCard = document.getElementById('cardItinerarioRota');
    if(divCard) divCard.style.display = 'none';

    idsPesquisadosNoMapa.clear();
    const input = document.getElementById('inputPesquisaMapa');
    if(input) input.value = '';

    const lista = window.listaCarteiraGlobalMapa || [];
    atualizarMapaCarteira(lista, null, true); 
    atualizarBotaoLimparMapa();
};

function processarAtualizacaoRota() {
    if (!routingControl) return;
    routingControl.setWaypoints(waypointsAtivos.map(wp => wp.latLng));
    mapaAtividades.closePopup();

    const divCard = document.getElementById('cardItinerarioRota');
    if(divCard) {
        divCard.innerHTML = '<div style="padding: 10px; font-size: 12px; color: #005596; background: white; border-radius: 8px; font-weight:bold; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">Calculando rota...</div>';
        divCard.style.display = 'block';
    }
    
    atualizarBotaoLimparMapa();
    const lista = window.listaCarteiraGlobalMapa || [];
    atualizarMapaCarteira(lista, null, true);
}

window.rotaBaseAteAqui = function(lat, lng, tituloDaAtividade, valorServico) {
    const nomeAjustado = tituloDaAtividade !== 'Base Dínamo' ? `PEP (${tituloDaAtividade})` : tituloDaAtividade;
    const servicoAjustado = valorServico !== '0' ? valorServico : null;

    waypointsAtivos = [
        { latLng: L.latLng(latDinamo, lngDinamo), nome: 'Base Dínamo', servico: null },
        { latLng: L.latLng(lat, lng), nome: nomeAjustado, servico: servicoAjustado }
    ];
    processarAtualizacaoRota();
};

window.iniciarRotaDaqui = function(lat, lng, tituloDaAtividade, valorServico) {
    const nomeAjustado = tituloDaAtividade !== 'Base Dínamo' ? `PEP (${tituloDaAtividade})` : tituloDaAtividade;
    const servicoAjustado = valorServico !== '0' ? valorServico : null;
    
    waypointsAtivos = [
        { latLng: L.latLng(lat, lng), nome: nomeAjustado, servico: servicoAjustado }
    ];
    
    if(mapaAtividades) mapaAtividades.closePopup();
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'info',
            title: 'Ponto de Partida Definido!',
            text: 'Agora navegue pelo mapa, clique no próximo destino e selecione "Adicionar à rota".',
            toast: true, position: 'top-end', showConfirmButton: false, timer: 4500
        });
    }
    
    atualizarBotaoLimparMapa();
    const lista = window.listaCarteiraGlobalMapa || [];
    atualizarMapaCarteira(lista, null, true);
};

window.adicionarDestino = function(lat, lng, tituloDaAtividade, valorServico) {
    const nomeAjustado = tituloDaAtividade !== 'Base Dínamo' ? `PEP (${tituloDaAtividade})` : tituloDaAtividade;
    const servicoAjustado = valorServico !== '0' ? valorServico : null;

    waypointsAtivos.push({ latLng: L.latLng(lat, lng), nome: nomeAjustado, servico: servicoAjustado });
    processarAtualizacaoRota();
};

window.excluirPontoRota = function(indexParaRemover) {
    if (waypointsAtivos.length > indexParaRemover) {
        waypointsAtivos.splice(indexParaRemover, 1);
        if (waypointsAtivos.length <= 1) {
            window.limparRotaBusca(); 
        } else {
            processarAtualizacaoRota();
        }
    }
};

window.toggleCardRota = function() {
    const lista = document.getElementById('listaRotasItinerario');
    const btn = document.getElementById('btnToggleRota');
    if (lista && btn) {
        if (lista.style.display === 'none') {
            lista.style.display = 'block'; btn.innerHTML = '−'; 
        } else {
            lista.style.display = 'none'; btn.innerHTML = '+'; 
        }
    }
};

// ==========================================
// 6. LEGENDA DO MAPA
// ==========================================
window.abrirLegendaMapa = function() {
    const svgTriangulo = `<svg width="18" height="18" viewBox="0 0 24 24"><polygon points="12,2 22,20 2,20" fill="#64748b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></svg>`;
    const svgLampada = `<svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M12,2 C7.5,2 4,5.5 4,10 C4,13.5 6.5,16.5 9,17.5 L9,20 C9,20.8 9.8,21.5 10.5,21.5 L13.5,21.5 C14.2,21.5 15,20.8 15,20 L15,17.5 C17.5,16.5 20,13.5 20,10 C20,5.5 16.5,2 12,2 Z" fill="#64748b" stroke="#ffffff" stroke-width="2"/>
        <rect x="9.5" y="21.5" width="5" height="2" rx="0.5" fill="#64748b" stroke="#ffffff" stroke-width="1"/>
    </svg>`;
    const svgQuadrado = `<svg width="18" height="18" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="#64748b" stroke="#ffffff" stroke-width="2"/></svg>`;
    const svgCirculo = `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#64748b" stroke="#ffffff" stroke-width="2"/></svg>`;

    const colorHtml = (cor) => `<div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${cor}; display: inline-block; border: 1px solid #cbd5e1; flex-shrink: 0;"></div>`;

    Swal.fire({
        title: 'Legenda do Mapa',
        width: '550px',
        html: `
            <div style="display: flex; gap: 20px; text-align: left; font-size: 0.85rem; color: #334155; margin-top: 15px;">
                <div style="flex: 1; border-right: 1px solid #e2e8f0; padding-right: 15px;">
                    <h4 style="color: #005596; margin: 0 0 10px 0; font-size: 0.95rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">Formas (Tipo de Atividade)</h4>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${svgTriangulo} <span>CLIENTES</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${svgLampada} <span>EMERGÊNCIA</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${svgQuadrado} <span>EQUIPAMENTOS</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${svgCirculo} <span>LIGAÇÕES / OUTROS</span></div>
                </div>
                <div style="flex: 1;">
                    <h4 style="color: #005596; margin: 0 0 10px 0; font-size: 0.95rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">Cores (Status SAP)</h4>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${colorHtml('#fc0404')} <span>ABER//ABER, ABER//ATEC, ABER//LOG</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${colorHtml('#f97316')} <span>LIB//PEND, LIB//DFEC, LIB//DEV</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${colorHtml('#261ffc')} <span>LIB//ATEC, LIB//LOG</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${colorHtml('#4ade80')} <span>LIB//ENER, LIB//CONC</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">${colorHtml('#16a34a')} <span>LIB//COMS, LIB//MED</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">${colorHtml('#260503')} <span>Outros (Padrão)</span></div>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #005596; text-align: left; font-size: 0.8rem; color: #475569;">
                <b>Destaque Visual:</b> Marcadores que <b>piscam</b> indicam que foram selecionados na tabela ou pesquisados pela lupa.
            </div>
        `,
        confirmButtonColor: '#005596',
        confirmButtonText: 'Fechar Legenda'
    });
};

// ==========================================
// 7. EXPANDIR MAPA PARA NOVA JANELA
// ==========================================
window.abrirMapaEmNovaJanela = function() {
    const dadosAtuais = window.listaCarteiraGlobalMapa || [];
    
    const novaJanela = window.open('', '_blank', 'width=1280,height=850,menubar=no,toolbar=no,location=no,status=no');
    
    if (!novaJanela) {
        Swal.fire({ icon: 'warning', title: 'Bloqueador de Pop-up', text: 'Permita pop-ups no navegador para usar este recurso.', confirmButtonColor: '#005596' });
        return;
    }

    novaJanela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Mapa Expandido - Carteira de Atividades</title>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
            <style>
                html, body, #mapaCarteiraContainer {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    font-family: Arial, sans-serif;
                    background: #f8fafc;
                }
                .leaflet-routing-container { display: none !important; }
                @keyframes blink-destaque {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.1; }
                }
                .map-icon-wrapper {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: transparent;
                    filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.5));
                }
                .marker-blink {
                    animation: blink-destaque 0.8s ease-in-out infinite;
                    z-index: 900 !important;
                }
                .marker-na-rota {
                    z-index: 1000 !important;
                    filter: drop-shadow(0px 0px 6px #10b981) drop-shadow(0px 2px 3px rgba(0,0,0,0.5));
                    transform: scale(1.15);
                    transition: all 0.3s ease;
                }
                .barra-topo-janela {
                    position: absolute;
                    top: 15px;
                    left: 15px;
                    z-index: 99999;
                    background: white;
                    padding: 8px 14px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    border: 1px solid #cbd5e1;
                }
            </style>
        </head>
        <body>
            <div class="barra-topo-janela">
                <span style="font-size: 13px; font-weight: bold; color: #005596;">🗺️ Mapa Expandido</span>
                <span id="contadorPontosMapa" style="font-size: 12px; background: #e0f2fe; color: #005596; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Carregando...</span>
                <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">Fechar Janela</button>
            </div>
            
            <div id="mapaCarteiraContainer"></div>

            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"></script>
            <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
            
            <script>
                window.listaCarteiraGlobalMapa = ${JSON.stringify(dadosAtuais)};

                window.onload = function() {
                    if (window.opener && typeof window.opener.atualizarMapaCarteira === 'function') {
                        window.iniciarRotaDaqui = window.opener.iniciarRotaDaqui;
                        window.adicionarDestino = window.opener.adicionarDestino;
                        window.rotaBaseAteAqui = window.opener.rotaBaseAteAqui;
                        window.excluirPontoRota = window.opener.excluirPontoRota;
                        window.toggleCardRota = window.opener.toggleCardRota;
                        
                        window.opener.carregarDependenciasMapa(() => {
                            window.opener.atualizarMapaCarteira(window.listaCarteiraGlobalMapa);
                        });
                    }
                };
            </script>
        </body>
        </html>
    `);
    novaJanela.document.close();
};