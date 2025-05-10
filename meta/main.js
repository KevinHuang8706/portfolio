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
  }
  
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
      });
  }
  
function renderCommitInfo(data, commits){
    const dl = d3.select('#stats').append('dl').attr('class','stats');
    dl.append('dt').text('Commits').append('dd').text(commits.length);
    dl.append('dt').text('Files').append('dd').text(d3.groups(data, d=>d.file).length);
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>')
      .append('dd').text(data.length);
    dl.append('dt').text('Max depth').append('dd')
      .text(d3.max(data, d=>d.depth));
    dl.append('dt').text('Longest line').append('dd')
      .text(d3.max(data, d=>d.length));
    const linesPerFile = d3.rollups(data, v=>v.length, d=>d.file);
    dl.append('dt').text('Max lines in a file').append('dd')
      .text(d3.max(linesPerFile, d=>d[1]));
  }
function renderScatterPlot(data, commits) {
    //─── 1) Set up SVG + margin convention ───────
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const fullWidth  = 1000;
    const fullHeight = 600;
    const width  = fullWidth  - margin.left - margin.right;
    const height = fullHeight - margin.top  - margin.bottom;
  
    const svg = d3.select('#chart')
      .append('svg')
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
  
    //─── 2) Scales ───────────────────────────────
    const xScale = d3.scaleTime()
      .domain(d3.extent(commits, d => d.datetime))
      .range([0, width])
      .nice();
  
    const yScale = d3.scaleLinear()
      .domain([0, 24])
      .range([height, 0]);
  
    // radius scale (√ for correct area)
    const sorted = commits.slice().sort((a, b) => b.totalLines - a.totalLines);
    const [minLines, maxLines] = d3.extent(sorted, d => d.totalLines);
    const rScale = d3.scaleSqrt()
      .domain([minLines, maxLines])
      .range([2, 30]);
  
    //─── 3) Gridlines & Axes ────────────────────
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
    //─── 4) Dots: radius, opacity, and events ───
    const dots = svg.selectAll('circle')
    .data(sorted, d=>d.id)
    .join('circle')
      .attr('cx', d=>xScale(d.datetime))
      .attr('cy', d=>yScale(d.hourFrac))
      .attr('r',  d=>rScale(d.totalLines))
      .attr('fill','steelblue')
      .style('fill-opacity',0.7);

    dots.on('mouseenter', function(event,d){
      d3.select(this).style('fill-opacity',1);
      renderTooltipContent(d);
      updateTooltipPosition(event);
      updateTooltipVisibility(true);
    })
    .on('mousemove', event=> updateTooltipPosition(event))
    .on('mouseleave', function(){
      d3.select(this).style('fill-opacity',0.7);
      updateTooltipVisibility(false);
    });
    const brush = d3.brush()
    .extent([[0,0],[width,height]])
    .on('start brush end', brushed);

  // put the brush overlay in its own <g>
    svg.append('g')
    .attr('class','brush')
    .call(brush);

  // pull circles & grid above it
    svg.selectAll('circle, .gridlines').raise();

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
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
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
    document.getElementById('commit-tooltip').hidden = !show;
  }
  
  function updateTooltipPosition(event) {
    const tt = document.getElementById('commit-tooltip');
    tt.style.left = `${event.clientX+10}px`;
    tt.style.top  = `${event.clientY+10}px`;
  }
;(async () => {
    const data    = await loadData();
    const commits = processCommits(data);  // your existing commit‐processing fn
    renderCommitInfo(data, commits);
    renderScatterPlot(data,commits);
  })();