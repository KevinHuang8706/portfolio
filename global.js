console.log("It's Alive");

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}


let pages = [
    {url: '/', title: 'Home'},
    {url: '/resume/', title: 'Resume'},
    {url: '/projects/', title: 'Projects'},
    {url: '/contacts/', title: 'Contacts'},
    {url: '/meta/', title: 'Meta'},
    {url: 'https://github.com/KevinHuang8706', title: 'Github'},
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? ""                  // Local server
  : "/portfolio"; 

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    let a = document.createElement('a');
    if(!url.startsWith('http')){
        url = BASE_PATH + url;
    }
    a.href = url;
    a.textContent = title;
    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname,
    );
    if (a.host !== location.host){
        a.target = "_blank"
    }
    nav.append(a)
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class = "color-scheme">
        Theme:
        <select>
        <option value="light dark">Automatic${matchMedia("(prefers-color-scheme: dark)").matches ? " (Dark)" : " (Light)"}</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        </select>
    </label>`
);

let select = document.querySelector('.color-scheme select');

// Modify the setColorScheme function
function setColorScheme(colorScheme) {
    // Cleanup previous automatic listeners
    if (window.colorSchemeMedia) {
        window.colorSchemeMedia.removeEventListener('change', window.colorSchemeListener);
    }

    if (colorScheme === 'light dark') {
        // Automatic mode: follow system preference
        const systemDark = matchMedia("(prefers-color-scheme: dark)");
        const updateDarkClass = () => {
            document.documentElement.classList.toggle('dark', systemDark.matches);
        };
        updateDarkClass();
        systemDark.addEventListener('change', updateDarkClass);
        window.colorSchemeMedia = systemDark;
        window.colorSchemeListener = updateDarkClass;
    } else {
        // Manual mode: toggle 'dark' class
        document.documentElement.classList.toggle('dark', colorScheme === 'dark');
    }

    document.documentElement.style.setProperty('color-scheme', colorScheme);
    select.value = colorScheme;
    localStorage.colorScheme = colorScheme;
}

if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  }
  
select.addEventListener('input', function(event) {
    const colorScheme = event.target.value;
    localStorage.colorScheme = colorScheme;
    setColorScheme(colorScheme);
});

const form = document.querySelector('form');
form?.addEventListener('submit', function(event) {
  event.preventDefault();
  
  const data = new FormData(this);
  const params = [];
  
  for (const [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }
  
  const mailtoURL = `${this.action}?${params.join('&')}`;
  location.href = mailtoURL;
});

export async function fetchJSON(url) {
    try {
      // Fetch the JSON file from the given URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
      return [];
    }
    
  }

  export function renderProjects(projects, containerElement) {
    if (!containerElement) return ;
    containerElement.innerHTML = '';
    projects.forEach(project => {
        const article = document.createElement('article');
        article.innerHTML = `
            <h2>${project.title}</h2>
            <img src="${project.image}" alt="${project.title}">
            <div class = "project-text">
              <p class="description">${project.description}</p>
              <p class="year"> ${project.year}</p>
            </div>
        `;
        containerElement.appendChild(article);
    });
    
  }

  export async function fetchGithubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`)
  }