#!/bin/bash
echo "Avvio del Validatore 5 Stelle LOD..."

# Apre un nuovo terminale per il backend
osascript -e 'tell app "Terminal" to do script "cd '$PWD'/backend && npm install && npm run dev"'

# Apre un nuovo terminale per il frontend
osascript -e 'tell app "Terminal" to do script "cd '$PWD'/frontend && npm install && npm run dev"'