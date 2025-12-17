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
import Suprimentos from './pages/Suprimentos';
import Usinagem from './pages/Usinagem';
import PainelEngenharia from './pages/PainelEngenharia';
import PainelModelagem from './pages/PainelModelagem';
import PainelFundicao from './pages/PainelFundicao';
import PainelUsinagem from './pages/PainelUsinagem';
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
    "Suprimentos": Suprimentos,
    "Usinagem": Usinagem,
    "PainelEngenharia": PainelEngenharia,
    "PainelModelagem": PainelModelagem,
    "PainelFundicao": PainelFundicao,
    "PainelUsinagem": PainelUsinagem,
}

export const pagesConfig = {
    mainPage: "Administracao",
    Pages: PAGES,
    Layout: __Layout,
};