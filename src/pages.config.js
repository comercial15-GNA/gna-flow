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
}

export const pagesConfig = {
    mainPage: "Administracao",
    Pages: PAGES,
    Layout: __Layout,
};