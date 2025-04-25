import { fetchGithubData } from "./global.js";


(async () => {
    const githubData = await fetchGithubData('kevinhuang8706');
    const profileStats = document.querySelector('#profile-stats');

    if (profileStats && githubData) {
        const dl = profileStats.querySelector('dl');
        dl.innerHTML = `
            <dt>Followers</dt>
            <dd>${githubData.followers}</dd>
            <dt>Following</dt>
            <dd>${githubData.following}</dd>
            <dt>Repos</dt>
            <dd>${githubData.public_repos}</dd>
            <dt>Gists</dt>
            <dd>${githubData.public_gists}</dd>
        `;
    }
})();
