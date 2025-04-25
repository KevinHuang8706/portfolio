import { fetchJSON, renderProjects } from '../global.js';

(async () => {
    const projects = await fetchJSON('../lib/projects.json');
    const projectsContainer = document.querySelector('.projects');
    renderProjects(projects, projectsContainer);
    const titleElement = document.querySelector('.projects-title');
    if (titleElement) titleElement.innerHTML += ` (${projects.length})`;
})();


