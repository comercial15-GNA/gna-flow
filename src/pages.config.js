import Home from './pages/Home';
import Administracao from './pages/Administracao';
import Comercial from './pages/Comercial';
import CriarOP from './pages/CriarOP';
import Engenharia from './pages/Engenharia';
import Expedicao from './pages/Expedicao';
import Fundicao from './pages/Fundicao';
import Liberacao from './pages/Liberacao';
import Lideranca from './pages/Lideranca';
import Modelagem from './pages/Modelagem';
import Suprimentos from './pages/Suprimentos';
import Usinagem from './pages/Usinagem';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Administracao": Administracao,
    "Comercial": Comercial,
    "CriarOP": CriarOP,
    "Engenharia": Engenharia,
    "Expedicao": Expedicao,
    "Fundicao": Fundicao,
    "Liberacao": Liberacao,
    "Lideranca": Lideranca,
    "Modelagem": Modelagem,
    "Suprimentos": Suprimentos,
    "Usinagem": Usinagem,
}

export const pagesConfig = {
    mainPage: "Administracao",
    Pages: PAGES,
    Layout: __Layout,
};