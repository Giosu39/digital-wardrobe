# Guardaroba digitale

App desktop personale (Windows) per catalogare i propri vestiti e comporre outfit.
Funziona completamente in locale: nessun account, nessun server.

> Nuovo PC? Leggi **[SETUP.md](SETUP.md)** per installare i requisiti e spostare i dati.

## Funzionalità

- **Catalogo capi**: foto, categoria e tipo, colori (rilevati in automatico dalla foto), marca, taglia,
  materiale, stagioni, occasioni, prezzo, data di acquisto, tag, note e preferiti.
- **Ricerca e filtri** combinabili, vista a griglia o a lista, ordinamento.
- **Editor foto**: ritaglio, zoom, rotazione e **rimozione dello sfondo con AI locale**
  (RMBG-1.4 su GPU tramite WebGPU, circa 0,2 s a foto; ripiego automatico su CPU).
  Puoi caricare le foto da file, trascinandole o incollandole con Ctrl+V.
- **Creatore di outfit**: tela su cui trascinare, spostare e ridimensionare i capi, con disposizione
  automatica "flat lay", livelli, occasioni e stagioni. Gli outfit si possono duplicare e mettere tra i preferiti.
- **Tema chiaro / scuro / di sistema.**

## Comandi

```powershell
npm install          # dipendenze
npm run app:dev      # avvia l'app in sviluppo
npm run app:build    # crea l'installer (src-tauri/target/release/bundle/nsis/)
```

## Struttura

```
src/                  interfaccia (React + TypeScript + Tailwind)
  pages/              Capi, Outfit (galleria + editor), Impostazioni
  components/         form capo, editor foto, modali, card...
  lib/
    db.ts             accesso al database SQLite
    images.ts         salvataggio e lettura delle foto
    bgRemoval.ts      rimozione sfondo (transformers.js + ONNX Runtime Web)
    colors.ts         estrazione dei colori dominanti e nomi dei colori
    filters.ts        ricerca e filtri
    outfitLayout.ts   disposizione automatica degli outfit
src-tauri/            parte nativa (Rust / Tauri 2)
  src/lib.rs          plugin e migrazioni del database
  tauri.conf.json     configurazione finestra, bundle, sicurezza
```

## Dati

Database e foto: `%APPDATA%\com.giosue.guardaroba` (`guardaroba.db` + `images\`).
Per il backup basta copiare questa cartella ad app chiusa.

In sviluppo (`npm run app:dev`) l'app usa **dati separati** nella stessa cartella
(`guardaroba-dev.db` + `images-dev\`), così le prove non toccano il guardaroba vero.

> ⚠️ Dopo aver aggiunto una migrazione del database (in `src-tauri/src/lib.rs`), rigenera e reinstalla
> l'installer: una versione installata più vecchia si rifiuta di aprire un database già migrato
> ("migration N was previously applied but is missing").

## Possibili sviluppi

- Suggerimenti di outfit in base al **meteo** (Open-Meteo, gratuito e senza chiave API).
- Generatore di outfit basato su regole: stagione, occasione, abbinamenti di colore, capi poco usati.
- Suggerimenti con un **LLM locale** tramite Ollama, sulla GPU e senza chiavi API.
- Diario "cosa ho indossato" e statistiche (costo per utilizzo, capi dimenticati).
- Export e import del backup direttamente dall'app.
