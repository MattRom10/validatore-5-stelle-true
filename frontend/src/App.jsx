import { useState } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [risultato, setRisultato] = useState(null)

  const gestisciFile = (event) => {
    setFile(event.target.files[0])
  }

  const analizzaDataset = async () => {
    if (!file) {
      alert("Seleziona prima un file!")
      return
    }

    // Usiamo FormData per impacchettare il file. 
    // "dataset" è il nome esatto che il backend (multer) si aspetta!
    const formData = new FormData()
    formData.append("dataset", file)

    try {
      const response = await fetch("http://localhost:5001/api/upload", {
        method: "POST",
        body: formData,
      })
      
      const data = await response.json()
      setRisultato(data)
    } catch (error) {
      console.error("Errore di connessione:", error)
      setRisultato({ error: "Errore di connessione con il backend" })
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Validatore 5 Stelle LOD</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input type="file" onChange={gestisciFile} />
        <button onClick={analizzaDataset} style={{ marginLeft: '10px' }}>
          Analizza Dati
        </button>
      </div>

      {risultato && (
        <div style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
          <h3>Risultato Diagnostica:</h3>
          <pre>{JSON.stringify(risultato, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default App