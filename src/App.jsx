import React, { useState } from 'react';
import { datosJugadores, analisisPartidoIA } from './datosJugadores';

export default function App() {
  // Datos del participante
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');

  // Estados persistentes separados para los goles por equipo (¡Aquí está la magia!)
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

  // Titulares elegidos globales (coexisten los de ambos países en la misma lista)
  const [titulares, setTitulares] = useState([]);

  // Datos del cambio clave táctico
  const [jugadorSale, setJugadorSale] = useState('');
  const [jugadorEntra, setJugadorEntra] = useState('');

  // Rangos de tiempo del partido
  const rangosMinutos = [
    "0' - 15' (Inicio)",
    "16' - 30' (Primer Tiempo)",
    "31' - 45' (Cierre 1T)",
    "46' - 60' (Arranque 2T)",
    "61' - 75' (Segundo Tiempo)",
    "76' - 90' (Agonía del partido)"
  ];

  const enviarPolla = async () => {
    // 1. Validar campos vacíos
    if (!nombre.trim() || !correo.trim()) {
      alert("Por favor, ingresa tu nombre y correo electrónico.");
      return;
    }

    // 2. Validar dominio corporativo
    const dominioRequerido = "@bancodeoccidente.com.co";
    if (!correo.toLowerCase().endsWith(dominioRequerido)) {
      alert(`Acceso denegado. Solo se permiten correos corporativos con la extensión ${dominioRequerido}`);
      return;
    }

    // 3. Validar los 11 titulares elegidos en total
    if (titulares.length !== 11) {
      alert(`Debes completar exactamente 11 titulares. Actualmente tienes ${titulares.length}/11.`);
      return;
    }

    // 🧹 Limpieza y validación matemática de goles para Colombia
    const colombiaLimpio = {};
    let totalGolesColombiaAsignados = 0;
    Object.keys(goleadoresColombia).forEach((id) => {
      const player_id = Number(id);
      const info = goleadoresColombia[id];
      if (titulares.includes(player_id) && info && (info.cantidadGoles || 0) > 0) {
        colombiaLimpio[id] = info;
        totalGolesColombiaAsignados += info.cantidadGoles;
      }
    });

    // 🧹 Limpieza y validación matemática de goles para RD Congo
    const congoLimpio = {};
    let totalGolesCongoAsignados = 0;
    Object.keys(goleadoresCongo).forEach((id) => {
      const player_id = Number(id);
      const info = goleadoresCongo[id];
      if (titulares.includes(player_id) && info && (info.cantidadGoles || 0) > 0) {
        congoLimpio[id] = info;
        totalGolesCongoAsignados += info.cantidadGoles;
      }
    });

    // ⚽ Validar consistencia matemática en Colombia
    if (totalGolesColombiaAsignados !== Number(golesColombia)) {
      alert(
        `⚠️ El marcador de Colombia no coincide:\n\n` +
        `Has configurado ${golesColombia} gol(es) para Colombia en el marcador global, ` +
        `pero los goles asignados a sus jugadores suman ${totalGolesColombiaAsignados} gol(es).`
      );
      return;
    }

    // ⚽ Validar consistencia matemática en RD Congo
    if (totalGolesCongoAsignados !== Number(golesCongo)) {
      alert(
        `⚠️ El marcador de RD Congo no coincide:\n\n` +
        `Has configurado ${golesCongo} gol(es) para RD Congo en el marcador global, ` +
        `pero los goles asignados a sus jugadores suman ${totalGolesCongoAsignados} gol(es).`
      );
      return;
    }

    // Estructura de datos unificada enviada como un único payload organizado hacia la API
    const payload = {
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      goles_colombia: Number(golesColombia),
      goles_congo: Number(golesCongo),
      titulares: titulares,
      goleadores: {
        colombia: colombiaLimpio,
        congo: congoLimpio
      },
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
        return;
      }

      alert("🎉 ¡Tu polla táctica ha sido registrada con éxito!");

    } catch (error) {
      console.error("Error al enviar:", error);
      alert("Hubo un error de red al enviar la polla.");
    }
  }; 

  // Alternar jugador en el XI titular sin resetear la memoria de goles del país
  const toggleTitular = (id) => {
    if (titulares.includes(id)) {
      setTitulares(titulares.filter(tId => tId !== id));
    } else {
      if (titulares.length >= 11) {
        alert("¡Ya seleccionaste tus 11 titulares!");
        return;
      }
      setTitulares([...titulares, id]);
    }
  };

  // Modificar cantidad de goles (+ o -) asignados según el equipo correspondiente
  const handleCantidadGolesChange = (jugadorId, nuevaCantidad, equipo) => {
    const esColombia = equipo === 'Colombia';
    const estadoActual = esColombia ? goleadoresColombia : goleadoresCongo;
    const setEstado = esColombia ? setGoleadoresColombia : setGoleadoresCongo;

    const infoActual = estadoActual[jugadorId] || { hizoGol: false, cantidadGoles: 0, rangosMinutosArray: [] };
    const rangosActuales = infoActual.rangosMinutosArray || [];
    let nuevosRangos = [...rangosActuales];
    
    if (nuevaCantidad > rangosActuales.length) {
      nuevosRangos.push(rangosMinutos[0]);
    } else {
      nuevosRangos = nuevosRangos.slice(0, nuevaCantidad);
    }

    setEstado(prev => ({
      ...prev,
      [jugadorId]: {
        ...infoActual,
        hizoGol: nuevaCantidad > 0,
        amountGoles: nuevaCantidad, // Compatible con tu backend
        cantidadGoles: nuevaCantidad,
        rangosMinutosArray: nuevosRangos
      }
    }));
  };

  // Cambiar el minuto de un gol específico según el equipo
  const handleRangoMultiGolChange = (jugadorId, golIndex, nuevoRango, equipo) => {
    const esColombia = equipo === 'Colombia';
    const setEstado = esColombia ? setGoleadoresColombia : setGoleadoresCongo;

    setEstado(prev => {
      const infoActual = prev[jugadorId] || { hizoGol: false, cantidadGoles: 0, rangosMinutosArray: [] };
      const nuevosRangos = [...(infoActual.rangosMinutosArray || [])];
      nuevosRangos[golIndex] = nuevoRango;
      
      return {
        ...prev,
        [jugadorId]: {
          ...infoActual,
          rangosMinutosArray: nuevosRangos
        }
      };
    });
  }; 

  const sugerirAlineacionIA = () => {
    const sugeridos = datosJugadores
      .filter(j => j.equipo === paisSeleccionado)
      .slice(0, 11)
      .map(j => j.id);
    setTitulares(sugeridos);
    
    if (paisSeleccionado === 'Colombia') {
      setGoleadoresColombia({
        10: { 
          hizoGol: true, 
          cantidadGoles: 1, 
          rangosMinutosArray: ["61' - 75' (Segundo Tiempo)"] 
        }
      });
      setGolesColombia(1); 
      setGolesCongo(0);
      setJugadorSale("James Rodríguez");
      setJugadorEntra("Juan Fernando Quintero");
    } else {
      setGoleadoresCongo({});
      setGolesColombia(0);
      setGolesCongo(0);
    }
  }; 

  const consultarIA = (id, stats) => {
    setTextosIA(prev => ({ ...prev, [id]: textosIA[id] ? "" : `💡 Análisis: ${stats}` }));
  };

  const jugadoresFiltrados = datosJugadores.filter(j => j.equipo === paisSeleccionado);
  const conteoTitularesPais = datosJugadores.filter(j => titulares.includes(j.id) && j.equipo === paisSeleccionado).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* Encabezado */}
      <header className="bg-slate-900 border-b border-slate-800 py-6 text-center shadow-lg">
        <h1 className="text-3xl md:text-4xl font-extrabold text-amber-500 tracking-wide">POLLA FUTBOLERA BdO </h1>
        <p className="text-slate-400 text-sm mt-1">23 de Junio - Colombia vs RD Congo</p>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {/* SECCIÓN 1: MARCADOR GLOBAL */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <h2 className="text-xl font-bold text-center text-slate-300 mb-4">¿Cuál será el marcador global?</h2>
          <div className="flex items-center justify-center gap-6 md:gap-12">
            <div className="text-center">
              <img src="https://flagcdn.com/w80/co.png" alt="Colombia" className="h-8 mx-auto object-contain mb-1" />
              <p className="font-semibold text-sm text-slate-400">Colombia</p>
              <input 
                type="number" min="0" value={golesColombia}
                onChange={(e) => setGolesColombia(parseInt(e.target.value) || 0)}
                className="w-16 h-14 bg-slate-800 text-center text-2xl font-bold rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 mt-2"
              />
            </div>
            <span className="text-2xl font-bold text-slate-600 mt-6">VS</span>
            <div className="text-center">
              <img src="https://flagcdn.com/w80/cd.png" alt="RD Congo" className="h-8 mx-auto object-contain mb-1" />
              <p className="font-semibold text-sm text-slate-400">RD Congo</p>
              <input 
                type="number" min="0" value={golesCongo}
                onChange={(e) => setGolesCongo(parseInt(e.target.value) || 0)}
                className="w-16 h-14 bg-slate-800 text-center text-2xl font-bold rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 mt-2"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN: DATOS DEL PARTICIPANTE */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <h2 className="text-base font-bold text-slate-300 mb-1 flex items-center gap-2">
            <span>👤</span> Datos del Participante
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Ingresa tus datos institucionales para validar tu participación única en la polla.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre Completo:</label>
              <input 
                type="text" placeholder="Ej. Juan Pérez" value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs focus:outline-none focus:border-amber-500 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Correo Electrónico Corporativo:</label>
              <input 
                type="email" placeholder="usuario@bancodeoccidente.com.co" value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs focus:outline-none focus:border-amber-500 text-slate-200"
              />
              <span className="text-[10px] text-amber-500/80 mt-1 block pl-1">
                * Obligatorio dominio @bancodeoccidente.com.co
              </span>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: AGENTE DE IA GLOBAL */}
        <section className="bg-slate-900 border border-purple-950 rounded-2xl p-5 shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl">🤖✨</span>
              <div>
                <h3 className="text-base font-bold text-purple-300">¿No sabes de fútbol? ¡Pregúntale al Agente IA!</h3>
                <p className="text-xs text-slate-400">Analiza las estadísticas de ambos equipos y recibe una sugerencia experta en segundos.</p>
              </div>
            </div>
            <button
              onClick={() => setMostrarIAGlobal(!mostrarIAGlobal)}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md"
            >
              {mostrarIAGlobal ? "🔮 Ocultar Recomendación" : "🔮 Analizar Partido con IA"}
            </button>
          </div>
          {mostrarIAGlobal && (
            <div className="mt-4 pt-4 border-t border-purple-950/60 text-slate-300 text-sm bg-purple-950/20 p-4 rounded-xl italic">
              <p className="font-semibold text-purple-400 mb-2">📊 Análisis de Rendimiento:</p>
              <p className="mb-3 leading-relaxed text-xs">{analisisPartidoIA.resumen}</p>
              <p className="font-semibold text-purple-400 mb-2 text-xs">💡 Datos Clave para tu Marcador:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                {analisisPartidoIA.datosClave.map((dato, index) => <li key={index}>{dato}</li>)}
              </ul>
            </div>
          )}
        </section>

        {/* INTERRUPTOR DE PAÍSES (¡Ya no limpia los goles al dar click!) */}
        <section className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button 
              onClick={() => setPaisSeleccionado('Colombia')}
              className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${paisSeleccionado === 'Colombia' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'}`}
            >
              Configurar Colombia
            </button>
            <button 
              onClick={() => setPaisSeleccionado('RD Congo')}
              className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${paisSeleccionado === 'RD Congo' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'}`}
            >
              Configurar RD Congo
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400">Elegidos: <strong className="text-amber-500 text-sm">{conteoTitularesPais}/11</strong></span>
            <button 
              onClick={sugerirAlineacionIA}
              className="bg-purple-950/80 border border-purple-800 text-purple-300 text-xs px-3 py-1.5 rounded-xl hover:bg-purple-900 transition"
            >
              ✨ Autocompletar con IA
            </button>
          </div>
        </section>

        {/* SECCIÓN 3: REJILLA DE JUGADORES */}
        <h2 className="text-lg font-bold text-slate-400 mb-3 px-1">Arma tu Equipo de los 11:</h2>
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {jugadoresFiltrados.map((jugador) => {
            const esTitular = titulares.includes(jugador.id);
            const textoIAJugador = textosIA[jugador.id];
            
            // Leemos dinámicamente del cajón correcto según el país actual
            const infoGol = (paisSeleccionado === 'Colombia' ? goleadoresColombia : goleadoresCongo)[jugador.id] || { hizoGol: false, cantidadGoles: 0, rangosMinutosArray: [] };

            return (
              <div 
                key={jugador.id} 
                className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between shadow-md transition-all ${esTitular ? 'border-amber-500 ring-1 ring-amber-500/30 bg-slate-900/90' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={jugador.foto} alt={jugador.nombre} 
                          className="w-14 h-14 rounded-full object-cover border border-slate-700 bg-slate-800"
                          onError={(e)=>{e.target.src="https://via.placeholder.com/150?text="+jugador.nombre.replace(" ", "+")}}
                        />
                        {esTitular && (
                          <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">XI</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{jugador.nombre}</h3>
                        <p className="text-[11px] text-slate-400">{jugador.posicion}</p>
                        <button
                          onClick={() => consultarIA(jugador.id, jugador.statsIA)}
                          className="mt-1 flex items-center gap-1 bg-purple-950/40 text-purple-300 text-[10px] px-2 py-0.5 rounded-full hover:bg-purple-900 transition"
                        >
                          ✨ {textoIAJugador ? 'Ocultar' : 'Análisis IA'}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleTitular(jugador.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${esTitular ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {esTitular ? 'Quitar' : 'Alinear'}
                    </button>
                  </div>

                  {/* Burbuja IA */}
                  {textoIAJugador && (
                    <div className="mt-2 text-[11px] bg-purple-950/20 border border-purple-900/30 text-purple-200 p-2 rounded-lg italic">
                      {textoIAJugador}
                    </div>
                  )}
                </div>

                {/* PANEL DE GOLES (Sólo si está en el XI titular) */}
                {esTitular && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 select-none">
                      <span className="flex items-center gap-2">⚽ ¿Cuántos goles marcará?</span>
                      
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleCantidadGolesChange(jugador.id, Math.max(0, (infoGol.cantidadGoles || 0) - 1), paisSeleccionado)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-amber-500 text-xs">
                          {infoGol.cantidadGoles || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCantidadGolesChange(jugador.id, (infoGol.cantidadGoles || 0) + 1, paisSeleccionado)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Selectores dinámicos por cada gol guardados en el array del respectivo país */}
                    {(infoGol.cantidadGoles || 0) > 0 && (
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1 flex flex-col gap-2">
                        {Array.from({ length: infoGol.cantidadGoles }).map((_, index) => (
                          <div key={index} className="flex flex-col gap-1">
                            <label className="block text-[10px] text-slate-500">
                              Rango de tiempo para el Gol #{index + 1}:
                            </label>
                            <select
                              value={infoGol.rangosMinutosArray?.[index] || rangosMinutos[0]}
                              onChange={(e) => handleRangoMultiGolChange(jugador.id, index, e.target.value, paisSeleccionado)}
                              className="w-full bg-slate-900 text-xs text-amber-400 font-semibold border border-slate-800 rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                            >
                              {rangosMinutos.map((rango, idx) => (
                                <option key={idx} value={rango}>{rango}</option>
                              ))}
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
  
        {/* SECCIÓN 4: CAMBIOS TÁCTICOS CLAVE */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mt-8">
          <h2 className="text-base font-bold text-slate-300 mb-1 flex items-center gap-2">
            <span>🔄</span> Cambio Estratégico Clave del Partido
          </h2>
          <p className="text-xs text-slate-500 mb-4">Escribe cuál crees que será la sustitución más importante que hará el entrenador.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">🔴 Sale del terreno de juego:</label>
              <input 
                type="text" placeholder="Ej. James Rodríguez" value={jugadorSale}
                onChange={(e) => setJugadorSale(e.target.value)}
                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs focus:outline-none focus:border-amber-500 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">🟢 Entra a revolucionar el partido:</label>
              <input 
                type="text" placeholder="Ej. Juan Fernando Quintero" value={jugadorEntra}
                onChange={(e) => setJugadorEntra(e.target.value)}
                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs focus:outline-none focus:border-amber-500 text-slate-200"
              />
            </div>
          </div>
        </section>

        {/* BOTÓN FINAL DE ENVÍO */}
        <div className="text-center mt-10">
          <button 
            onClick={enviarPolla}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-base px-10 py-3.5 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            Enviar mi Polla Táctica 🚀
          </button>
        </div>
      </main>
    </div>
  );
}