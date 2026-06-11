import React, { useState } from 'react';
import { datosJugadores, analisisPartidoIA } from './datosJugadores';
export default function App() {
  // tiempo de espera
  const [cargando, setCargando] = useState(false);
  // analisis global del partido generado por IA
  const [mostrarAnalisisGlobal, setMostrarAnalisisGlobal] = useState(false);
  const [textoAnalisisGlobal, setTextoAnalisisGlobal] = useState("");
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
  // 🔥 SOLUCIÓN: Separamos las alineaciones en dos listas completamente independientes
  const [titularesColombia, setTitularesColombia] = useState([]);
  const [titularesCongo, setTitularesCongo] = useState([]);
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
    // 🔥 Validamos que CADA país tenga exactamente sus 11 jugadores configurados
    if (titularesColombia.length !== 11) {
      alert(`Debes completar los 11 titulares de Colombia. Llevas ${titularesColombia.length}/11.`);
      return;
    }
    if (titularesCongo.length !== 11) {
      alert(`Debes completar los 11 titulares de RD Congo. Llevas ${titularesCongo.length}/11.`);
      return;
    }
    const colombiaLimpio = {};
    let totalGolesColombiaAsignados = 0;
    Object.keys(goleadoresColombia).forEach((id) => {
      const player_id = Number(id);
      const info = goleadoresColombia[id];
      if (titularesColombia.includes(player_id) && info && (info.amountGoles || 0) > 0) {
        colombiaLimpio[id] = info;
        totalGolesColombiaAsignados += info.amountGoles;
      }
    });
    const congoLimpio = {};
    let totalGolesCongoAsignados = 0;
    Object.keys(goleadoresCongo).forEach((id) => {
      const player_id = Number(id);
      const info = goleadoresCongo[id];
      if (titularesCongo.includes(player_id) && info && (info.amountGoles || 0) > 0) {
        congoLimpio[id] = info;
        totalGolesCongoAsignados += info.amountGoles;
      }
    });
    if (totalGolesColombiaAsignados !== Number(golesColombia)) {
      alert(`⚠️ El marcador de Colombia no coincide:\n\nHas configurado ${golesColombia} gol(es) en el marcador global, pero los goles asignados a sus jugadores suman ${totalGolesColombiaAsignados}.`);
      return;
    }
    if (totalGolesCongoAsignados !== Number(golesCongo)) {
      alert(`⚠️ El marcador de RD Congo no coincide:\n\nHas configurado ${golesCongo} gol(es) en el marcador global, pero los goles asignados a sus jugadores suman ${totalGolesCongoAsignados}.`);
      return;
    }
    setCargando(true); // Activa el estado de carga
    // Unificamos ambos arreglos de titulares para mandarlos de forma transparente a la API de Supabase
    
    const payload = {
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      goles_colombia: Number(golesColombia),
      goles_congo: Number(golesCongo),
      titulares: [...titularesColombia, ...titularesCongo], // Mandamos los 22 IDs elegidos
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
      if (!response.ok) {
            alert(`⚠️ ${resultado.detail}`);
        } else {
            alert("🎉 ¡Tu polla táctica ha sido registrada con éxito!");
        }
    } catch (error) {
        alert("Hubo un error de red al enviar la polla.");
    } finally {
        setCargando(false); // Desactiva el estado de carga pase lo que pase
    }
  }; 
  // 🔥 Lógica de toggling optimizada e independiente para cada selección
  const toggleTitular = (id) => {
    const playerId = Number(id);
    const esColombia = paisSeleccionado === 'Colombia';
    
    const listaActual = esColombia ? titularesColombia : titularesCongo;
    const setLista = esColombia ? setTitularesColombia : setTitularesCongo;
    if (listaActual.includes(playerId)) {
      setLista(listaActual.filter(tId => tId !== playerId));
    } else {
      if (listaActual.length >= 11) {
        alert(`¡Ya seleccionaste los 11 titulares para ${paisSeleccionado}! Remueve un jugador de este equipo si deseas cambiarlo.`);
        return;
      }
      setLista([...listaActual, playerId]);
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
    const sugeridosPais = datosJugadores.filter(j => j.equipo === paisSeleccionado).map(j => Number(j.id)).slice(0, 11);
    
    if (paisSeleccionado === 'Colombia') {
      setTitularesColombia(sugeridosPais);
      setGoleadoresColombia({ 10: { hizoGol: true, amountGoles: 1, cantidadGoles: 1, rangosMinutosArray: ["61' - 75' (Segundo Tiempo)"] } });
      setGolesColombia(1); setGolesCongo(0);
      setJugadorSale("James Rodríguez"); setJugadorEntra("Juan Fernando Quintero");
    } else {
      setTitularesCongo(sugeridosPais);
    }
  }; 
  const consultarIA = (id, stats) => {
    setTextosIA(prev => ({ ...prev, [id]: textosIA[id] ? "" : `💡 Análisis: ${stats}` }));
  };
  // Filtrado estricto por la pestaña activa
  const jugadoresFiltrados = datosJugadores.filter(j => j.equipo === paisSeleccionado);
  
  // Contador reactivo según el país en el que esté parado el usuario
  const conteoTitularesActual = paisSeleccionado === 'Colombia' ? titularesColombia.length : titularesCongo.length;
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
        {/* BOTÓN ANÁLISIS GLOBAL (Aquí estaba el error, ahora está en el JSX) */}
        <section className="mb-8 text-center">
          <button 
            type="button" 
            onClick={() => {
              setMostrarAnalisisGlobal(!mostrarAnalisisGlobal);
              setTextoAnalisisGlobal("💡 Análisis Táctico: Ambos equipos muestran una tendencia fuerte al ataque por las bandas.");
            }}
            className="bg-purple-900/50 border border-purple-700 text-purple-200 text-sm font-bold px-6 py-2 rounded-full hover:bg-purple-800 transition-all"
          >
            {mostrarAnalisisGlobal ? 'Ocultar Análisis de la IA' : 'Ver Análisis de la IA del Partido'}
          </button>
          {mostrarAnalisisGlobal && (
            <div className="mt-4 bg-slate-900 border border-purple-900/30 p-4 rounded-2xl text-purple-200 text-sm italic shadow-lg">
              {textoAnalisisGlobal}
            </div>
          )}
        </section>
        {/* PARTICIPANTE */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo:</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre Apellido" className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs focus:border-amber-500 text-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Corporativo:</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="usuario@bancodeoccidente.com.co" className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs focus:border-amber-500 text-slate-200" />
            </div>
          </div>
        </section>
        {/* TABS DE SELECCIÓN */}
        <section className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button type="button" onClick={() => setPaisSeleccionado('Colombia')} className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${paisSeleccionado === 'Colombia' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
              Configurar Colombia
            </button>
            <button type="button" onClick={() => setPaisSeleccionado('RD Congo')} className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${paisSeleccionado === 'RD Congo' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
              Configurar RD Congo
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Elegidos en {paisSeleccionado}: <strong className="text-amber-500 text-sm">{conteoTitularesActual}/11</strong></span>
            <button type="button" onClick={sugerirAlineacionIA} className="bg-purple-950/80 border border-purple-800 text-purple-300 text-xs px-3 py-1.5 rounded-xl">✨ Autocompletar con IA</button>
          </div>
        </section>
        {/* REJILLA DE JUGADORES */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {jugadoresFiltrados.map((jugador) => {
            // Buscamos si está seleccionado evaluando la lista correcta según la pestaña actual
            const esColombia = paisSeleccionado === 'Colombia';
            const esTitular = esColombia 
              ? titularesColombia.includes(Number(jugador.id)) 
              : titularesCongo.includes(Number(jugador.id));
            const infoGol = (esColombia ? goleadoresColombia : goleadoresCongo)[jugador.id] || { amountGoles: 0, rangosMinutosArray: [] };
            return (
              <div 
                key={`${paisSeleccionado}-${jugador.id}`} 
                className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between shadow-md transition-all ${esTitular ? 'border-amber-500 ring-2 ring-amber-500/40 bg-slate-900 shadow-amber-500/5' : 'border-slate-800'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={jugador.foto} alt={jugador.nombre} className="w-14 h-14 rounded-full object-cover border border-slate-700 bg-slate-800" />
                      {esTitular && <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">XI</span>}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{jugador.nombre}</h3>
                      <p className="text-[11px] text-slate-400">{jugador.posicion}</p>
                      <button type="button" onClick={() => consultarIA(jugador.id, jugador.statsIA)} className="mt-1 bg-purple-950/40 text-purple-300 text-[10px] px-2 py-0.5 rounded-full">
                        {textosIA[jugador.id] ? 'Ocultar' : 'Análisis IA'}
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleTitular(jugador.id)} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${esTitular ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                    {esTitular ? 'Quitar' : 'Alinear'}
                  </button>
                </div>
                {textosIA[jugador.id] && (
                  <div className="mt-2 text-[11px] bg-purple-950/20 border border-purple-900/30 text-purple-200 p-2 rounded-lg italic">{textosIA[jugador.id]}</div>
                )}
                {/* CONTROLES DE GOLES */}
                {esTitular && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>⚽ ¿Cuántos goles marcará?</span>
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button type="button" onClick={() => handleCantidadGolesChange(jugador.id, Math.max(0, (infoGol.amountGoles || 0) - 1), paisSeleccionado)} className="w-6 h-6 flex items-center justify-center rounded-md font-bold text-slate-400">-</button>
                        <span className="w-6 text-center font-bold text-amber-500">{infoGol.amountGoles || 0}</span>
                        <button type="button" onClick={() => handleCantidadGolesChange(jugador.id, (infoGol.amountGoles || 0) + 1, paisSeleccionado)} className="w-6 h-6 flex items-center justify-center rounded-md font-bold text-slate-400">+</button>
                      </div>
                    </div>
                    {(infoGol.amountGoles || 0) > 0 && (
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1 flex flex-col gap-2">
                        {Array.from({ length: infoGol.amountGoles }).map((_, index) => (
                          <div key={index} className="flex flex-col gap-1">
                            <label className="block text-[10px] text-slate-500">Minuto Gol #{index + 1}:</label>
                            <select value={infoGol.rangosMinutosArray?.[index] || rangosMinutos[0]} onChange={(e) => handleRangoMultiGolChange(jugador.id, index, e.target.value, paisSeleccionado)} className="w-full bg-slate-900 text-xs text-amber-400 font-semibold border border-slate-800 rounded px-2 py-1">
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
          <button 
            type="button" 
            onClick={enviarPolla} 
            disabled={cargando} // Deshabilita el botón mientras carga
            className={`font-extrabold text-base px-10 py-3.5 rounded-xl shadow-lg transition-all ${
              cargando 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
            }`}
          >
            {cargando ? 'Procesando registro...' : 'Enviar mi Polla Táctica 🚀'}
          </button>
        </div>
      </main>
    </div>
  );
}
