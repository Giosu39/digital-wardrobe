# Guida: preparare un nuovo PC

Questa guida serve quando ti ritrovi davanti al progetto su un PC "pulito" (Windows 10/11),
senza gli strumenti necessari installati. Segui i passi nell'ordine.

> **Vuoi solo usare l'app, senza modificarla?**
> Non serve niente di tutto questo: basta l'installer `Guardaroba_x.y.z_x64-setup.exe`
> (vedi [Creare l'installer](#5-creare-linstaller)) e poi [riportare i tuoi dati](#6-spostare-i-dati-dal-vecchio-pc).
> Conviene tenerne una copia insieme al backup dei dati.

---

## 1. Requisiti

| Strumento | A cosa serve | Versione usata |
| --- | --- | --- |
| **Git** | scaricare il progetto | 2.55 |
| **Node.js** (LTS) | interfaccia (React + Vite) | 24.x |
| **Rust** (tramite rustup) | parte nativa dell'app (Tauri) | 1.99 stable |
| **Microsoft C++ Build Tools** | compilatore usato da Rust su Windows | Visual Studio 2026 |
| **WebView2 Runtime** | motore che mostra l'interfaccia | già incluso in Windows 11 |

## 2. Installazione dei requisiti

Apri **PowerShell** (non serve come amministratore) e lancia questi comandi uno alla volta.
`winget` è già presente su Windows 10/11 aggiornati.

```powershell
# Git
winget install --id Git.Git -e

# Node.js LTS
winget install --id OpenJS.NodeJS.LTS -e

# Rust (installer ufficiale rustup)
winget install --id Rustlang.Rustup -e
```

### C++ Build Tools (manuale, una sola volta)

Rust su Windows ha bisogno del compilatore Microsoft:

1. Vai su <https://visualstudio.microsoft.com/it/visual-cpp-build-tools/> e scarica **Build Tools for Visual Studio**.
   In alternativa va bene anche **Visual Studio Community**.
2. Nell'installer seleziona il carico di lavoro **"Sviluppo di applicazioni desktop con C++"**,
   lasciando le opzioni predefinite (MSVC e Windows SDK).
3. Installa e riavvia il PC se richiesto.

### WebView2

Su Windows 11 c'è già. Su Windows 10, se l'app parte con una finestra bianca o non parte,
installa "Evergreen Bootstrapper" da <https://developer.microsoft.com/microsoft-edge/webview2/>.

### Verifica

**Chiudi e riapri PowerShell**, così vengono caricati i nuovi PATH, poi:

```powershell
git --version
node -v        # deve essere >= 22
npm -v
rustc --version
cargo --version
```

Se `rustc` non viene trovato, riavvia il PC oppure esegui `rustup default stable`.

## 3. Scaricare il progetto e installare le dipendenze

```powershell
cd "$HOME\Documents"
git clone <URL-del-repository> digital-wardrobe
cd digital-wardrobe
npm install
```

`npm install` scarica le librerie JavaScript. Le dipendenze Rust vengono scaricate
in automatico al primo avvio.

## 4. Avviare l'app in sviluppo

```powershell
npm run app:dev
```

La **prima volta** la compilazione Rust richiede qualche minuto; poi parte in pochi secondi.
Le modifiche all'interfaccia (cartella `src/`) si vedono subito, senza riavviare.

## 5. Creare l'installer

```powershell
npm run app:build
```

L'installer viene generato qui:

```
src-tauri\target\release\bundle\nsis\Guardaroba_<versione>_x64-setup.exe
```

Puoi installarlo come un normale programma: comparirà nel menu Start come **Guardaroba**.

## 6. Spostare i dati dal vecchio PC

Tutti i dati (database e foto) stanno in **una sola cartella**:

```
%APPDATA%\com.giosue.guardaroba
```

dove si trovano `guardaroba.db` (il database) e `images\` (le foto dei capi).
Dall'app ci arrivi anche da **Impostazioni → Dati e backup → Apri cartella**.

Per trasferire i dati:

1. Sul vecchio PC **chiudi l'app** e copia l'intera cartella `com.giosue.guardaroba`, per esempio su chiavetta o cloud.
2. Sul nuovo PC installa o avvia l'app una volta, poi chiudila.
3. Incolla la cartella copiata in `%APPDATA%\`, sostituendo quella esistente.
4. Riapri l'app.

> Per un backup periodico basta copiare la stessa cartella. Fallo ad app chiusa,
> altrimenti i file `guardaroba.db-wal` / `-shm` potrebbero non essere ancora stati scritti nel database.

### Il modello AI per la rimozione dello sfondo

Il modello (circa 90 MB) **non** è nella cartella dati: si trova nella cache di WebView2
(`%LOCALAPPDATA%\com.giosue.guardaroba\EBWebView`). Sul nuovo PC viene scaricato di nuovo
in automatico la prima volta che usi "Rimuovi sfondo", quindi in quel momento serve internet.

## 7. Problemi comuni

| Problema | Soluzione |
| --- | --- |
| `error: linker 'link.exe' not found` | Mancano i C++ Build Tools (vedi punto 2). |
| `rustc` / `cargo` non trovati, oppure `failed to run 'cargo metadata' ... program not found` | Il terminale è stato aperto prima di installare Rust e non vede il nuovo PATH. Se usi VS Code **chiudilo del tutto e riaprilo** (chiudere solo il terminale non basta); altrimenti riavvia il PC. Soluzione al volo, valida solo per quella finestra: `$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"` |
| `Port 1420 is already in use` | C'è già un'altra istanza di `app:dev` aperta: chiudila. |
| La rimozione sfondo dice "Elaborato con CPU" | WebGPU non disponibile (driver GPU vecchi?). Funziona lo stesso, solo più lentamente (circa 7 s invece di 0,2 s). Aggiorna i driver NVIDIA. |
| La rimozione sfondo fallisce al primo uso | Serve internet per scaricare il modello la prima volta. |
| Errori strani dopo `npm install` | Elimina `node_modules` e `package-lock.json`, poi rilancia `npm install`. |

## 8. Note per chi aggiorna le dipendenze

- `@huggingface/transformers` e `onnxruntime-web` hanno **versioni fissate** in `package.json`.
  `onnxruntime-web` deve coincidere con la versione richiesta da transformers
  (controlla con `npm ls onnxruntime-web`, deve esserci una sola versione, "deduped").
  Se aggiorni transformers, aggiorna anche onnxruntime-web alla stessa versione da cui dipende.
- Non tutti i modelli di rimozione sfondo girano su WebGPU in WebView2 (c'è un limite di
  16 storage buffer per shader). Testati e funzionanti: RMBG-1.4, ISNet, MODNet.
  **Non** funzionano: BiRefNet, BEN2. L'elenco dei modelli è in `src/lib/bgRemoval.ts`.
