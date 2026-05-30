import React, { useState } from 'react';
import { datosJugadores, analisisPartidoIA } from './datosJugadores';

export default function App() {
  // Datos del participante
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');

  // Estados persistentes separados para los goles por equipo
  const [goleadoresColombia, setGoleadoresColombia] = useState({});
  const [goleadoresCongo, setGoleadoresCongo] = useState({});

  // Estados para el marcador global
  const [golesColombia, setGolesColombia] = useState(0);
  const [golesCongo, setGolesCongo] = useState(0);
  
  // Filtro de país actual para la interfaz
  const [paisSeleccionado, setPaisSeleccionado] = useState('Colombia');

  // Estados de IA
  const [mostrarIAGlobal, setMostrarIAGlobal] = useState(false);
  const [textosIA, setTextosIA] = useState({});

  // Titulares elegidos globales (Guarda los IDs numéricos elegidos de AMBOS países)
  const [titulares, setTitulares] = useState([]);

  // Datos del cambio clave táctico
  const [jugadorSale, setJugadorSale] = useState('');
  const [jugadorEntra, setJugadorEntra] = useState('');

  const rangosMinutos = [
    "0' - 15' (Inicio)",
    "16' - 30' (Primer Tiempo)",
    "31' - 45' (Cierre 1T)",
    "46' - 60' (Arranque 2T)",
    "61' - 75' (Segundo Tiempo)",
    "76' - 90' (Agonía del partido)"
  ];

  const enviarPolla = async () => {
    if (!nombre.trim() || !correo.trim()) {
      alert("Por favor, ingresa tu nombre y correo electrónico.");
      return;
    }

    const dominioRequerido = "@bancodeoccidente.com.co";
    if (!correo.toLowerCase().endsWith(dominioRequerido)) {
      alert(`Acceso denegado. Solo se permiten correos corporativos con la extensión ${dominioRequerido}`);
      return;
    }

    if (titulares.length !== 11) {
      alert(`Debes completar exactamente 11 titulares. Actualmente tienes ${titulares.length}/11.`);
      return;
    }

    const colombiaLimpio = {};
    let totalGolesColombiaAsignados = 0;
    Object.keys(goleadoresColombia).forEach((id) => {
      const player_id = Number(id);
      const info = goleadoresColombia[id];
      if (titulares.includes(player_id) && info && (info.amountGoles || 0) > 0) {
        colombiaLimpio[id] = info;
        totalGolesColombiaAsignados += info.amountGoles;
      }
    });

    const congoLimpio = {};
    let totalGolesCongoAsignados = 0;
    Object.keys(goleadoresCongo).forEach((id) => {
      const player_id = Number(id);
      const info = goleadoresCongo[id];
      if (titulares.includes(player_id) && info && (info.amountGoles || 0) > 0) {
        congoLimpio[id] = info;
        totalGolesCongoAsignados += info.amountGoles;
      }
    });

    if (totalGolesColombiaAsignados !== Number(golesColombia)) {
      alert(`⚠️ El marcador de Colombia no coincide:\n\nHas configurado ${golesColombia} gol(es) en el marcador global, pero los goles asignados a tus jugadores suman ${totalGolesColombiaAsignados}.`);
      return;
    }

    if (totalGolesCongoAsignados !== Number(golesCongo)) {
      alert(`⚠️ El marcador de RD Congo no coincide:\n\nHas configurado ${golesCongo} gol(es) en el marcador global, pero los goles asignados a tus jugadores suman ${totalGolesCongoAsignados}.`);
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      goles_colombia: Number(golesColombia),
      goles_congo: Number(golesCongo),
      titulares: titulares,
      goleadores: { colombia: colombiaLimpio, congo: congoLimpio },
      cambio_sale: jugadorSale,
      cambio_entra: jugadorEntra
    };

    try {
      const response = await fetch('https://bancodeoccidente-fh4l.onrender.com/api/polla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resultado = await response.json();
      if (!response.ok) { alert(`⚠️ ${resultado.detail}`); return; }
      alert("🎉 ¡Tu polla táctica ha sido registrada con éxito!");
    } catch (error) {
      alert("Hubo un error de red al enviar la polla.");
    }
  }; 

  // Toggle de alineación forzando conversión numérica limpia
  const toggleTitular = (id) => {
    const playerId = Number(id);
    if (titulares.includes(playerId)) {
      setTitulares(titulares.filter(tId => tId !== playerId));
    } else {
      if (titulares.length >= 11) {
        alert("¡Ya seleccionaste tus 11 titulares globales! Remueve un jugador antes de agregar otro.");
        return;
      }
      setTitulares([...titulares, playerId]);
    }
  };

  const handleCantidadGolesChange = (jugadorId, nuevaCantidad, equipo) => {
    const esColombia = equipo === 'Colombia';
    const setEstado = esColombia ? setGoleadoresColombia : setGoleadoresCongo;

    setEstado(prev => {
      const infoActual = prev[jugadorId] || { hizoGol: false, amountGoles: 0, rangosMinutosArray: [] };
      let nuevosRangos = [...(infoActual.rangosMinutosArray || [])];
      
      if (nuevaCantidad > nuevosRangos.length) {
        nuevosRangos.push(rangosMinutos[0]);
      } else {
        nuevosRangos = nuevosRangos.slice(0, nuevaCantidad);
      }

      return {
        ...prev,
        [jugadorId]: {
          hizoGol: nuevaCantidad > 0,
          amountGoles: nuevaCantidad,
          cantidadGoles: nuevaCantidad,
          rangosMinutosArray: nuevosRangos
        }
      };
    });
  };

  const handleRangoMultiGolChange = (jugadorId, golIndex, nuevoRango, equipo) => {
    const esColombia = equipo === 'Colombia';
    const setEstado = esColombia ? setGoleadoresColombia : setGoleadoresCongo;
    setEstado(prev => {
      const infoActual = prev[jugadorId] || { rangosMinutosArray: [] };
      const nuevosRangos = [...infoActual.rangosMinutosArray];
      nuevosRangos[golIndex] = nuevoRango;
      return { ...prev, [jugadorId]: { ...infoActual, rangosMinutosArray: nuevosRangos } };
    });
  }; 

  const sugerirAlineacionIA = () => {
    const sugeridosPais = datosJugadores.filter(j => j.equipo === paisSeleccionado).map(j => Number(j.id));
    const titularesOtrosPaises = titulares.filter(id => {
      const jug = datosJugadores.find(j => Number(j.id) === id);
      return jug && jug.equipo !== paisSeleccionado;
    });

    setTitulares([...titularesOtrosPaises, ...sugeridosPais].slice(0, 11));
    if (paisSeleccionado === 'Colombia') {
      setGoleadoresColombia({ 10: { hizoGol: true, amountGoles: 1, cantidadGoles: 1, rangosMinutosArray: ["61' - 75' (Segundo Tiempo)"] } });
      setGolesColombia(1); setGolesCongo(0);
      setJugadorSale("James Rodríguez"); setJugadorEntra("Juan Fernando Quintero");
    }
  }; 

  const consultarIA = (id, stats) => {
    setTextosIA(prev => ({ ...prev, [id]: textosIA[id] ? "" : `💡 Análisis: ${stats}` }));
  };

  // Filtrado reactivo estricto por la pestaña activa
  const jugadoresFiltrados = datosJugadores.filter(j => j.equipo === paisSeleccionado);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      <header className="bg-slate-900 border-b border-slate-800 py-6 text-center shadow-lg">
        <h1 className="text-3xl md:text-4xl font-extrabold text-amber-500 tracking-wide">POLLA FUTBOLERA BdO</h1>
        <p className="text-slate-400 text-sm mt-1">Colombia vs RD Congo</p>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {/* MARCADOR GLOBAL */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <h2 className="text-xl font-bold text-center text-slate-300 mb-4">¿Cuál será el marcador global?</h2>
          <div className="flex items-center justify-center gap-6 md:gap-12">
            <div className="text-center">
              <img src="https://flagcdn.com/w80/co.png" alt="Colombia" className="h-8 mx-auto mb-1" />
              <input type="number" min="0" value={golesColombia} onChange={(e) => setGolesColombia(parseInt(e.target.value) || 0)} className="w-16 h-14 bg-slate-800 text-center text-2xl font-bold rounded-xl border border-slate-700 focus:border-amber-500" />
            </div>
            <span className="text-2xl font-bold text-slate-600">VS</span>
            <div className="text-center">
              <img src="https://flagcdn.com/w80/cd.png" alt="RD Congo" className="h-8 mx-auto mb-1" />
              <input type="number" min="0" value={golesCongo} onChange={(e) => setGolesCongo(parseInt(e.target.value) || 0)} className="w-16 h-14 bg-slate-800 text-center text-2xl font-bold rounded-xl border border-slate-700 focus:border-amber-500" />
            </div>
          </div>
        </section>

        {/* PARTICIPANTE */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo:</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs focus:border-amber-500 text-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Corporativo:</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs focus:border-amber-500 text-slate-200" />
            </div>
          </div>
        </section>

        {/* TABS DE SELECCIÓN */}
        <section className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 distinct-tabs">
            <button type="button" onClick={() => setPaisSeleccionado('Colombia')} className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${paisSeleccionado === 'Colombia' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
              Configurar Colombia
            </button>
            <button type="button" onClick={() => setPaisSeleccionado('RD Congo')} className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${paisSeleccionado === 'RD Congo' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
              Configurar RD Congo
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Elegidos: <strong className="text-amber-500 text-sm">{titulares.length}/11</strong></span>
            <button type="button" onClick={sugerirAlineacionIA} className="bg-purple-950/80 border border-purple-800 text-purple-300 text-xs px-3 py-1.5 rounded-xl">✨ Autocompletar con IA</button>
          </div>
        </section>

        {/* REJILLA DE JUGADORES (Mantiene el resaltado de forma persistente) */}
        {/* REJILLA DE JUGADORES */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {jugadoresFiltrados.map((jugador) => {
            // 1. Forzamos la verificación del ID convirtiéndolo a número
            const esTitular = titulares.includes(Number(jugador.id));
            
            // 2. Extraemos la información de goles del equipo correspondiente de forma dinámica
            const infoGol = (paisSeleccionado === 'Colombia' ? goleadoresColombia : goleadoresCongo)[jugador.id] || { amountGoles: 0, rangosMinutosArray: [] };

            return (
              <div 
                // 🔥 CRUCIAL 1: Al meter el país en la key, obligamos a React a destruir la tarjeta vieja 
                // y crear una nueva al cambiar de pestaña. Así Banza JAMÁS se quedará pegado en Colombia.
                key={`${paisSeleccionado}-${jugador.id}`} 
                
                // 🔥 CRUCIAL 2: Evaluamos 'esTitular'. Si el jugador está seleccionado en el estado global,
                // el borde amarillo se quedará pintado fijamente aunque vayas a la otra pestaña y regreses.
                className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between shadow-md transition-all ${
                  esTitular 
                    ? 'border-amber-500 ring-2 ring-amber-500/40 bg-slate-900 shadow-amber-500/5' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={jugador.foto} 
                        alt={jugador.nombre} 
                        className="w-14 h-14 rounded-full object-cover border border-slate-700 bg-slate-800" 
                        onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=" + jugador.nombre.replace(" ", "+"); }}
                      />
                      {esTitular && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">XI</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{jugador.nombre}</h3>
                      <p className="text-[11px] text-slate-400">{jugador.posicion}</p>
                      <button 
                        type="button" 
                        onClick={() => consultarIA(jugador.id, jugador.statsIA)} 
                        className="mt-1 bg-purple-950/40 text-purple-300 text-[10px] px-2 py-0.5 rounded-full hover:bg-purple-900 transition"
                      >
                        {textosIA[jugador.id] ? 'Ocultar' : 'Análisis IA'}
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => toggleTitular(jugador.id)} 
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                      esTitular ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {esTitular ? 'Quitar' : 'Alinear'}
                  </button>
                </div>

                {/* Desplegable de Análisis de IA por jugador */}
                {textosIA[jugador.id] && (
                  <div className="mt-2 text-[11px] bg-purple-950/20 border border-purple-900/30 text-purple-200 p-2 rounded-lg italic">
                    {textosIA[jugador.id]}
                  </div>
                )}

                {/* PANEL DE GOLES (Persistente si el jugador está en el XI) */}
                {esTitular && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 select-none">
                      <span>⚽ ¿Cuántos goles marcará?</span>
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button 
                          type="button" 
                          onClick={() => handleCantidadGolesChange(jugador.id, Math.max(0, (infoGol.amountGoles || 0) - 1), paisSeleccionado)} 
                          className="w-6 h-6 flex items-center justify-center rounded-md font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-amber-500">{infoGol.amountGoles || 0}</span>
                        <button 
                          type="button" 
                          onClick={() => handleCantidadGolesChange(jugador.id, (infoGol.amountGoles || 0) + 1, paisSeleccionado)} 
                          className="w-6 h-6 flex items-center justify-center rounded-md font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Selectores de minutos por cada gol marcado */}
                    {(infoGol.amountGoles || 0) > 0 && (
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1 flex flex-col gap-2">
                        {Array.from({ length: infoGol.amountGoles }).map((_, index) => (
                          <div key={index} className="flex flex-col gap-1">
                            <label className="block text-[10px] text-slate-500">Minuto Gol #{index + 1}:</label>
                            <select 
                              value={infoGol.rangosMinutosArray?.[index] || rangosMinutos[0]} 
                              onChange={(e) => handleRangoMultiGolChange(jugador.id, index, e.target.value, paisSeleccionado)} 
                              className="w-full bg-slate-900 text-xs text-amber-400 font-semibold border border-slate-800 rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                            >
                              {rangosMinutos.map((rango, idx) => <option key={idx} value={rango}>{rango}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
  
        {/* ESTRATEGIA */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mt-8">
          <h2 className="text-base font-bold text-slate-300 mb-1">🔄 Cambio Estratégico Clave</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <input type="text" placeholder="Sale: Ej. James Rodríguez" value={jugadorSale} onChange={(e) => setJugadorSale(e.target.value)} className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-slate-200" />
            <input type="text" placeholder="Entra: Ej. Quintero" value={jugadorEntra} onChange={(e) => setJugadorEntra(e.target.value)} className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-slate-200" />
          </div>
        </section>

        <div className="text-center mt-10">
          <button type="button" onClick={enviarPolla} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-base px-10 py-3.5 rounded-xl shadow-lg">Enviar mi Polla Táctica 🚀</button>
        </div>
      </main>
    </div>
  );
}