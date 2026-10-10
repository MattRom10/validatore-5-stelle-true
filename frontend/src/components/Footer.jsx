import React from 'react';
import './Footer.css';

const Footer = () => {
  const annoCorrente = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p>&copy; {annoCorrente} Matteo Maria Romano. Tutti i diritti riservati.</p>
        <p>Progetto di Tesi in Ingegneria Informatica e dell'Automazione</p>
        <p className="footer-university">Politecnico di Bari</p>
      </div>
    </footer>
  );
};

export default Footer;