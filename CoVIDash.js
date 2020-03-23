document.addEventListener('DOMContentLoaded', Initialize);
document.addEventListener('resize', Update);

var DM = {};
var CN = [];
var loaded = false;
LoadData();

function Argsort(A) {
    var Ind = new Array(A.length);
    for (var i = 0; i < A.length; ++i)
        Ind[i] = i;
    Ind.sort(function (a, b) { return A[a] < A[b] ? -1 : A[a] > A[b] ? 1 : 0; });
    return Ind;
}

function LoadData() {
    Plotly.d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
    function(err, rows) {

        if (rows.length <= 0)
            return;
            
        var KN  = Object.keys(rows[0]);
        var DL  = [];
        var DCN = [];
        for (var i = 0; i < KN.length; i++) {
            var di = Date.parse(KN[i]);
            if (di !== di)
                continue;
            DL.push(di);
            DCN.push(KN[i]);
        }
         
        if (DL.length <= 0)
            return;
        // Group by country
        for (var i = 0; i < rows.length; i++) {
            var clab = ToLab(rows[i]['Country/Region']);
            var cri = DM[clab] || null;
            if (cri === null) {
                cri = [];
                for (j = 0; j < DL.length; ++j)
                    cri.push(0);
            }
            for (var j = 0; j < DCN.length; j++)
                cri[j] += Number.parseInt(rows[i][DCN[j]]);
            DM[clab] = cri;
        }
        CN = Object.keys(DM);
        var ca = new Array(CN.length);
        for (var i = 0; i < CN.length; i++) {
            var cri = DM[CN[i]];
            ca[i] = 0;
            for (var j = 0; j < cri.length; j++)
                ca[i] += cri[j];
        }
        // Sort country names by number of deaths
        var SO = Argsort(ca);
        var SCN = new Array(CN.length);
        for (var i = 0; i < CN.length; i++)
            SCN[i] = CN[SO[CN.length - i - 1]];
        CN = SCN;
        
        loaded = true;
    });
}

function GetOpt(id) {
    var e = document.getElementById(id)
    if (e === null)
        return '';
    if (e.selectedIndex == 0)
        return '';
    return e.options[e.selectedIndex].text;
}

function GetLayout() {
    var s1 = GetOpt('C1Sel');
    var s2 = GetOpt('C2Sel');
    var ttl = ((s1 !== '') && (s2 !== '')) ? `<b style="font-size: 1.5em">Projecting CoVID-19 Death Rate from ${s1} to ${s2}</b>` : `<b style="font-size: 1.5em">Projecting CoVID-19 Death Rate</b>`

    return {
        plot_bgcolor: "#323232",
        paper_bgcolor: "#363636",
        title: ttl,
        font: {color: '#D0D0D0'},
        xaxis: {
            rangeslider: {visible: true},
            type: 'integer',
            title: {
                text: 'Day Offset',
                font: {color: '#D0D0D0', size: 18}
            },
            tickfont: { size: 16 }
        },
        yaxis: {
            autorange: true,
            type: 'linear',
            title: {
                text: 'Total Deaths',
                font: {color: '#D0D0D0', size: 18}
            },
            tickfont: { size: 16 }
        },
        style: {textAlign: 'center'}
    };
}

function Initialize() {
    Plot([]);

    if (!loaded) {
        setTimeout(Initialize, 512);
        return;
    }

    var s1 = document.getElementById('C1Sel');
    var s2 = document.getElementById('C2Sel');
    if ((s1 === null) || (s2 === null))
        return;

    for (var i = 0; i < CN.length; ++i) {
        var Oi = document.createElement('option');
        Oi.value     = CN[i];
        Oi.innerHTML = CN[i];
        s1.appendChild(Oi);
        Oi = document.createElement('option');
        Oi.value     = CN[i];
        Oi.innerHTML = CN[i];
        s2.appendChild(Oi);
    }
}

function Plot(tr) {
    if (document.getElementById('PlotDiv') === null)
        return 1;
    Plotly.newPlot('PlotDiv', tr, GetLayout());
    return 0;
}

function ToLab(S) {
    var ss = S.split(' ');
    if (ss.length <= 1)
        return S;
    var n = '';
    for (var i = 0; i < ss.length; i++)
        n += (ss[i].length > 0) ? ss[i][0] : '';
    return n;
}

function Update() {
    var s1 = document.getElementById('C1Sel');
    var s2 = document.getElementById('C2Sel');
    if ((s1 === null) || (s2 === null) || (s1.selectedIndex <= 0) || (s2.selectedIndex <= 0) || !loaded)
        return Plot([]);

    var c1 = s1.options[s1.selectedIndex].text;
    var c2 = s2.options[s2.selectedIndex].text;

    var cr1 = DM[c1] || null;
    var cr2 = DM[c2] || null;

    if ((cr1 === null) || (cr2 === null))
        return Plot([]);

    var c1f = false;
    var c2f = false;
    var X1 = [];
    var X2 = [];
    var rv1 = [];
    var rv2 = [];
    // Only keep from date of first death
    for (var i = 0; i <    cr1.length; i++) {
        c1f = c1f || (cr1[i] > 0);
        if (c1f) {
            rv1.push(cr1[i]);
            X1.push(X1.length);
        }
        
        c2f = c2f || (cr2[i] > 0);
        if (c2f) {
            rv2.push(cr2[i]);
            X2.push(X2.length);
        }
    }

    if (rv2.length > rv1.length) {
        var tmp = rv2;
        rv2 = rv1;
        rv1 = tmp;
        
        tmp = c2;
        c2  = c1;
        c1  = tmp;

        tmp = X2;
        X2  = X1;
        X1 = tmp;
    }


    for (var i = 0; i < rv2.length; i++)
        
    // Projections from rv1 onto rv2
    var rv3 = [];
    var di1 = 0.;
    var di2 = 0.;
    var di3 = 0.;
    for (var i = 0; i < rv1.length; i++) {
        // Smooth growth rate
        di1 = di2;
        di2 = di3;
        di3 = (rv1[i] - rv1[i - 1]) / rv1[i - 1];
        if (i < rv2.length) {
            rv3.push(rv2[i]);
            continue;
        }

        var nv = rv3[i - 1] + rv3[i - 1] * (di1 + di2 + di3) / 3.;
        rv3.push(Math.floor(nv));
    }

    var trace1 = {
        type: "scatter",
        mode: "lines",
        name: c1,
        x: X1,
        y: rv1,
        line: {color: '#A03020', width: 5}
    }

    var trace2 = {
        type: "scatter",
        mode: "lines",
        name: c2,
        x: X2,
        y: rv2,
        line: {color: '#7F7F7F', width: 5}
    }

    var trace3 = {
        type: "scatter",
        mode: "lines",
        name: c2 + '-Pred',
        x: X1,
        y: rv3,
        line: {color: '#7F7F7F', dash: 'dot', width: 5}
    }

    Plot([trace1, trace2, trace3]);
}

