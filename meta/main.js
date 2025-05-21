import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData(){
    const data = await d3.csv('loc.csv', row=>({
      ...row,
      line:   +row.line,
      depth:  +row.depth,
      length: +row.length,
      date:    new Date(row.Date + 'T00:00' + row.timezone),
      datetime:new Date(row.datetime),
    }));
    return data;
};
  
function processCommits(data){
  return d3.groups(data, d => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: `https://github.com/kevinhuang8706/commit/${commit}`,
        author, date, time, timezone, datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes()/60,
        totalLines: lines.length,
      };
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable:   false,
        configurable: true
      });
      return ret;
    })
    .sort((a, b) => a.datetime - b.datetime);;
};
  
function renderCommitInfo(data, commits){
    d3.select('#stats dl').remove();
    d3.select('#stats dd').remove();
    d3.select('#stats dt').remove();
    const dl = d3.select('#stats').append('dl').attr('class','stats');
    dl.append('dt').text('Commits').append('dd').attr('id', 'commit-count').text(commits.length);
    dl.append('dt').text('Files').append('dd').text(d3.groups(data, d=>d.file).length);
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>')
      .append('dd').attr('id','total-lines').text(data.length);
    dl.append('dt').text('Max depth').append('dd')
      .text(d3.max(data, d=>d.depth));
    dl.append('dt').text('Longest line').append('dd')
      .text(d3.max(data, d=>d.length));
    const linesPerFile = d3.rollups(data, v=>v.length, d=>d.file);
    dl.append('dt').text('Max lines in a file').append('dd')
      .text(d3.max(linesPerFile, d=>d[1]));
  }

function renderFileSizes() {
    // clear and select the <dl class="files">
  const dl = d3.select('.files').html('');
  
    // 2.1 flatten & group
  const lines = filteredCommits.flatMap(d => d.lines);
  let files = d3.groups(lines, d => d.file)
                .map(([name, lines]) => ({ name, lines }));
  
    // 2.3 sort descending by #lines
  files = d3.sort(files, d => -d.lines.length);
  
    // 2.4 color scale by line.type
  //const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  
    // bind & draw one <div> per file
  const rows = dl.selectAll('div')
                  .data(files, d => d.name)
                  .join('div');
  
    // filename + total count
  rows.append('dt')
      .html(d => 
          `<code>${d.name}</code>
           <small>${d.lines.length} lines</small>`
      );
  
    // unit-viz dots
  //rows.append('dd')
  //    .selectAll('div')
  //    .data(d => d.lines)
  //    .join('div')
  //    .attr('class', 'line')
  //    .style('background', line => fileTypeColors(line.type));
}
  
function updateScatterPlot(filteredCommits){
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const fullWidth  = 1000;
  const fullHeight = 600;
  const width  = fullWidth  - margin.left - margin.right;
  const height = fullHeight - margin.top  - margin.bottom;

  d3.select('#chart svg').remove();
  const svg = d3.select('#chart')
    .append('svg')
      .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  const xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.datetime))
    .range([0, width])
    .nice();
  const yScale = d3.scaleLinear()
  .domain([0, 24])
  .range([height, 0]);
  svg.selectAll('g').remove();
  const sorted = filteredCommits.slice().sort((a, b) => b.totalLines - a.totalLines)
  const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt()
      .domain([minLines, maxLines])
      .range([5, 30]);
  svg.append('g')
    .attr('class', 'gridlines')
    .call(d3.axisLeft(yScale)
    .tickSize(-width)
    .tickFormat(''));
  
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale));
  
  svg.append('g')
    .call(d3.axisLeft(yScale)
    .tickFormat(d => String(d).padStart(2, '0') + ':00')); 
  const brush = d3.brush()
  .extent([[0,0],[width,height]])
  .on('start brush end', brushed);

// put the brush overlay in its own <g>
  svg.selectAll('circle, .gridlines').raise();
  svg.append('g').attr('class','brush').call(brush);
  const dots = svg.append('g')
    .selectAll('circle')
    .data(filteredCommits, d=>d.id)
    .join(      
      enter => enter.append('circle')
    .attr('r', 0)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .call(enter => enter.transition().duration(300)
      .attr('r', d => rScale(d.totalLines))
      .attr('fill', 'steelblue')
      .style('fill-opacity', 0.7)),
  update => update,
  exit => exit.transition().duration(300)
    .attr('r', 0)
    .remove()
    );
  dots.on('mouseenter', function(event, d) {
      d3.select(this)
        .style('fill-opacity', 1)
        .attr('fill', '#ff6b6b');
      renderTooltipContent(d);
      updateTooltipPosition(event);
      updateTooltipVisibility(true);
    })
    .on('mousemove', function(event) {
      event.preventDefault(); // Prevent any default behaviors
      updateTooltipPosition(event);
    })
    .on('mouseleave', function() {
      d3.select(this)
        .style('fill-opacity', 0.7)
        .attr('fill', 'steelblue'); ;
      updateTooltipVisibility(false);
  });
  dots.raise();
// pull circles & grid above it

  function brushed({selection}) {
    dots.classed('selected', d => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }
  function isCommitSelected(selection, commit) {
    if (!selection) { 
        return false; 
    } 
    const [x0, x1] = selection.map((d) => d[0]);
    const [y0, y1] = selection.map((d) => d[1]);
    const x = xScale(commit.datetime); 
    const y = yScale(commit.hourFrac); 
    return x >= x0 && x <= x1 && y >= y0 && y <= y1; 
  }
  
  function renderSelectionCount(selection) {
    const count = selection
      ? sorted.filter(d=>isCommitSelected(selection,d)).length
      : 0;
    const el = document.getElementById('selection-count');
    el.textContent = count
      ? `${count} commits selected`
      : 'No commits selected';
  }
  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? filteredCommits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : filteredCommits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines </dd>
              <dd>(${formatted})</dd>
          `;
    }
  }  
}
function renderTooltipContent(d) {
  document.getElementById('commit-link').href        = d.url;
  document.getElementById('commit-link').textContent = d.id;
  document.getElementById('commit-date').textContent = d.datetime
    .toLocaleDateString('en',{dateStyle:'full'});
  document.getElementById('commit-time').textContent = d.datetime
    .toLocaleTimeString('en',{timeStyle:'short'});
  document.getElementById('commit-author').textContent = d.author;
  document.getElementById('commit-lines').textContent  = d.totalLines;
}
  
function updateTooltipVisibility(show) {
  const tooltip = document.getElementById('commit-tooltip');
  if (show) {
    tooltip.style.display = 'block';
    tooltip.hidden = false;
  } else {
    tooltip.style.display = 'none';
    tooltip.hidden = true;
  }
}

function updateTooltipPosition(event) {
  const tt = document.getElementById('commit-tooltip');
  tt.style.left = `${event.clientX+10}px`;
  tt.style.top  = `${event.clientY+10}px`;
}


function filterCommitsByTime() {
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  d3.select('#commit-count').text(filteredCommits.length);
  const totalLines = d3.sum(filteredCommits, d => d.totalLines);
  d3.select('#total-lines').text(totalLines);
}

function updateTimeDisplay() {
  commitProgress = +timeSlider.property('value');
  commitMaxTime  = timeScale.invert(commitProgress);
  selectedTime.text(
    commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' })
  );
  filterCommitsByTime();
  updateScatterPlot(filteredCommits);
  renderFileSizes();
}


function renderItems(startIndex) {
  // Clear things off
  itemsContainer.selectAll('div').remove();
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  console.log(startIndex, endIndex);
  let newCommitSlice = commits.slice(startIndex, endIndex);
  // TODO: how should we update the scatterplot (hint: it's just one function call)
  updateScatterPlot(newCommitSlice);
  d3.select('#commit-count').text(newCommitSlice.length);
  d3.select('#total-lines')
    .text(d3.sum(newCommitSlice, d => d.totalLines));
  renderCommitInfo(data,commits);
  // 3) update the file‐sizes dots
  //displayCommitFiles()

  // Re-bind the commit data to the container and represent each using a div
  itemsContainer.selectAll('div')
                .data(newCommitSlice)
                .enter()
                .append('div')
                .attr('class', 'item')
                .html((d,i) => `
                <p>
                On ${d.datetime.toLocaleString('en',{dateStyle:'full',timeStyle:'short'})}, I
                <a class="narrative-link" href="${d.url}" target="_blank">
                  ${i === 0 ? 'made my first glorious commit' : 'made another glorious commit'}
                </a>,
                editing ${d.totalLines} lines...
                </p>
                `)
                .style('position', 'absolute')
                .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
}
function displayCommitFiles() {
  const lines = filteredCommits.flatMap((d) => d.lines);
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });
  files = d3.sort(files, (d) => -d.lines.length);
  d3.select('.files').selectAll('div').remove();
  let filesContainer = d3
    .select('.files')
    .selectAll('div')
    .data(files)
    .enter()
    .append('div');
  filesContainer
    .append('dt')
    .html(
      (d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`,
    );
}



let data, commits, filteredCommits;
let commitProgress,timeScale, commitMaxTime;
let timeSlider, selectedTime;
let NUM_ITEMS; // Ideally, let this value be the length of your commit history
let ITEM_HEIGHT = 100; // Feel free to change
let VISIBLE_COUNT = 8; // Feel free to change as well
let totalHeight;
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');


async function init(){
  data = await loadData();
  commits = processCommits(data);
  NUM_ITEMS = commits.length;
  totalHeight = NUM_ITEMS * ITEM_HEIGHT;
  filteredCommits = commits.slice();
  //renderCommitInfo(data, commits);
  //renderScatterPlot(data,commits);
  commitProgress = 100;
  timeScale = d3.scaleTime(
    [d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)],
    [0, 100],
  );
  commitMaxTime = timeScale.invert(commitProgress);
  //timeSlider    = d3.select('#time-slider');
  //selectedTime  = d3.select('#selected-time');
  //timeSlider.on('input', updateTimeDisplay);
  //updateTimeDisplay();
  scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    const maxScroll = spacer.node().offsetHeight - scrollContainer.node().clientHeight;
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
  renderItems(0);
  console.log(commits[12]);
}

init();