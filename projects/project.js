import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let projects = [];
let filteredProjects = [];
let selectedYear = null;
let query = '';
let projectsContainer = document.querySelector('.projects');
;(async function init(){
    projects = await fetchJSON('../lib/projects.json');
    const titleElement = document.querySelector('h1');
    if (titleElement) titleElement.innerHTML += `: ${projects.length} Projects`; 
    //
    update();
    let searchInput = document.querySelector('.searchBar');
    searchInput.addEventListener('change', (event) => {
    // update query value
        query = event.target.value;
        update();
    });
})();
function update(){
    // store one list for pie chart, filtered after query
    let queried= [];
    // another list filtered with both query and year
    // so that the pie chart functions as normal with a fixed query, instead of displaying the joint
    let query_year = [];
    queried = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase())
    })
    query_year = (selectedYear===null) ? queried :queried.filter((p) => String(p.year) === selectedYear)
    filteredProjects = query_year;
    renderProjects(filteredProjects, projectsContainer);
    if (query_year.length!=0&&!query){
        renderPieChart(projects);
    } else{
        renderPieChart(queried);
    }
}
function renderPieChart(projects){
    const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let colors = d3.scaleOrdinal(d3.schemePaired);
    const sliceGenerator = d3.pie().value((d)=>d.value);
    let selectedIndex = -1;
    let rolledData = d3.rollups(
        projects,
        (v) => v.length,
        (d) => d.year,
    );
    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    let svg = d3.select('svg');
    let legend = d3.select(".legend");
    svg.selectAll('path').remove();
    legend.selectAll('li').remove();
    sliceGenerator(data).forEach((slice, idx) => {
        let d = data[idx];
        svg
        .append('path')
        .attr('d', arcGenerator(slice))
        .attr('fill', colors(idx))
        .classed('selected', d.label === selectedYear)
        .on('click', ()=>{
            selectedYear = selectedYear === d.label ? null : d.label;
            //legend.selectAll('li').classed('selected', (_, j) => data[j].label === selectedYear);
            //svg.selectAll('path').classed('selected', (_, j) => data[j].label === selectedYear);
            update();
        });
        legend
        .append('li')
        .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
        .classed('selected', d.label === selectedYear)
        .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
        .on('click', ()=>{
            selectedYear = selectedYear === d.label ? null : d.label;
            update();
        })
    });
}




  
    

