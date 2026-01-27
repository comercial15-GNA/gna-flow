import Administracao from './pages/Administracao';
import Comercial from './pages/Comercial';
import CriarOP from './pages/CriarOP';
import Engenharia from './pages/Engenharia';
import Expedicao from './pages/Expedicao';
import Fundicao from './pages/Fundicao';
import Home from './pages/Home';
import Liberacao from './pages/Liberacao';
import Lideranca from './pages/Lideranca';
import Modelagem from './pages/Modelagem';
import PainelEngenharia from './pages/PainelEngenharia';
import PainelFundicao from './pages/PainelFundicao';
import PainelModelagem from './pages/PainelModelagem';
import PainelUsinagem from './pages/PainelUsinagem';
import Suprimentos from './pages/Suprimentos';
import Usinagem from './pages/Usinagem';
import Acabamento from './pages/Acabamento';
import Coleta from './pages/Coleta';
import SuporteIndustrial from './pages/SuporteIndustrial';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Administracao": Administracao,
    "Comercial": Comercial,
    "CriarOP": CriarOP,
    "Engenharia": Engenharia,
    "Expedicao": Expedicao,
    "Fundicao": Fundicao,
    "Home": Home,
    "Liberacao": Liberacao,
    "Lideranca": Lideranca,
    "Modelagem": Modelagem,
    "PainelEngenharia": PainelEngenharia,
    "PainelFundicao": PainelFundicao,
    "PainelModelagem": PainelModelagem,
    "PainelUsinagem": PainelUsinagem,
    "Suprimentos": Suprimentos,
    "Usinagem": Usinagem,
    "Acabamento": Acabamento,
    "Coleta": Coleta,
    "SuporteIndustrial": SuporteIndustrial,
}

export const pagesConfig = {
    mainPage: "Administracao",
    Pages: PAGES,
    Layout: __Layout,
};