/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Acabamento from './pages/Acabamento';
import Administracao from './pages/Administracao';
import Coleta from './pages/Coleta';
import Comercial from './pages/Comercial';
import CriarOP from './pages/CriarOP';
import Engenharia from './pages/Engenharia';
import Expedicao from './pages/Expedicao';
import Fundicao from './pages/Fundicao';
import Home from './pages/Home';
import Liberacao from './pages/Liberacao';
import Lideranca from './pages/Lideranca';
import Modelagem from './pages/Modelagem';
import PainelAcabamento from './pages/PainelAcabamento';
import PainelColeta from './pages/PainelColeta';
import PainelEngenharia from './pages/PainelEngenharia';
import PainelExpedicao from './pages/PainelExpedicao';
import PainelFundicao from './pages/PainelFundicao';
import PainelLiberacao from './pages/PainelLiberacao';
import PainelModelagem from './pages/PainelModelagem';
import PainelSuprimentos from './pages/PainelSuprimentos';
import PainelUsinagem from './pages/PainelUsinagem';
import RelatoriosPeso from './pages/RelatoriosPeso';
import SuporteIndustrial from './pages/SuporteIndustrial';
import Suprimentos from './pages/Suprimentos';
import Usinagem from './pages/Usinagem';
import EspelhoImpressao from './pages/EspelhoImpressao';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Acabamento": Acabamento,
    "Administracao": Administracao,
    "Coleta": Coleta,
    "Comercial": Comercial,
    "CriarOP": CriarOP,
    "Engenharia": Engenharia,
    "Expedicao": Expedicao,
    "Fundicao": Fundicao,
    "Home": Home,
    "Liberacao": Liberacao,
    "Lideranca": Lideranca,
    "Modelagem": Modelagem,
    "PainelAcabamento": PainelAcabamento,
    "PainelColeta": PainelColeta,
    "PainelEngenharia": PainelEngenharia,
    "PainelExpedicao": PainelExpedicao,
    "PainelFundicao": PainelFundicao,
    "PainelLiberacao": PainelLiberacao,
    "PainelModelagem": PainelModelagem,
    "PainelSuprimentos": PainelSuprimentos,
    "PainelUsinagem": PainelUsinagem,
    "RelatoriosPeso": RelatoriosPeso,
    "SuporteIndustrial": SuporteIndustrial,
    "Suprimentos": Suprimentos,
    "Usinagem": Usinagem,
    "EspelhoImpressao": EspelhoImpressao,
}

export const pagesConfig = {
    mainPage: "Administracao",
    Pages: PAGES,
    Layout: __Layout,
};