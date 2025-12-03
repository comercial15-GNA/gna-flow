import Administracao from './pages/Administracao';
import CriarOP from './pages/CriarOP';
import Comercial from './pages/Comercial';
import Engenharia from './pages/Engenharia';
import Modelagem from './pages/Modelagem';
import Suprimentos from './pages/Suprimentos';
import Fundicao from './pages/Fundicao';
import Usinagem from './pages/Usinagem';
import Liberacao from './pages/Liberacao';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Administracao": Administracao,
    "CriarOP": CriarOP,
    "Comercial": Comercial,
    "Engenharia": Engenharia,
    "Modelagem": Modelagem,
    "Suprimentos": Suprimentos,
    "Fundicao": Fundicao,
    "Usinagem": Usinagem,
    "Liberacao": Liberacao,
}

export const pagesConfig = {
    mainPage: "Administracao",
    Pages: PAGES,
    Layout: __Layout,
};