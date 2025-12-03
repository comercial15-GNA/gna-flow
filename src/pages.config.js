import Administracao from './pages/Administracao';
import CriarOP from './pages/CriarOP';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Administracao": Administracao,
    "CriarOP": CriarOP,
}

export const pagesConfig = {
    mainPage: "Administracao",
    Pages: PAGES,
    Layout: __Layout,
};