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

function Arange(n) {
    var X = new Array(n);
    for (var i = 0; i < n; i++)
        X[i] = i;
    return X
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
            if (cri === null)
                cri = Zeros(DL.length);
            for (var j = 0; j < DCN.length; j++)
                cri[j] += Number.parseInt(rows[i][DCN[j]]);
            DM[clab] = cri;
        }

        // Global counts
        var SCN = Object.keys(DM);
        var glb = Zeros(DL.length);
        for (var i = 0; i < SCN.length; i++) {
            var cri = DM[SCN[i]];
            for (var j = 0; j < cri.length; j++)
                glb[j] += cri[j];
        }
        DM['Global'] = glb;
        
        // Sort country names by number of deaths
        SCN = Object.keys(DM);
        var ca = Zeros(SCN.length);
        for (var i = 0; i < SCN.length; i++) {
            var cri = DM[SCN[i]];
            for (var j = 0; j < cri.length; j++)
                ca[i] += cri[j];
        }
        var SO = Argsort(ca);
        CN = new Array(SCN.length);
        for (var i = 0; i < CN.length; i++)
            CN[i] = SCN[SO[SCN.length - i - 1]];
        
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
                text: 'Day Offset (Aligned to First Death)',
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
    Plotly.newPlot('PlotDiv', tr, GetLayout(), {responsive: true});
    return 0;
}

function ToLab(S) {
    var sfx = ', South'
    if      (S.endsWith(sfx))
        S = 'South ' + S.slice(0, S.length - sfx.length);
    else if (S === 'United Kingdom')
        S = 'UK';
    S = S.replace(/[^ 0-9a-zA-Z]/g, '');
    if (S.length < 12)
        return S;
    return S.slice(0, 12) + '...';
}

function GetCountryData(cn) {
    var cr = DM[cn] || null;
    if (cr === null)
        return null;
    
    // Only keep from date of first death
    var ci = cr.length;
    for (var i = 0; i < cr.length; i++) {
        if (cr[i] > 0) {
            ci = i;
            break;
        }
    }

    return cr.slice(ci);
}

function Update() {
    var s1 = document.getElementById('C1Sel');
    var s2 = document.getElementById('C2Sel');
    if ((s1 === null) || (s2 === null) || ((s1.selectedIndex <= 0) && (s2.selectedIndex <= 0)) || !loaded)
        return Plot([]);

    var c1 = s1.options[s1.selectedIndex].text;
    var c2 = s2.options[s2.selectedIndex].text;
    var rv1 = GetCountryData(c1);
    var rv2 = GetCountryData(c2);
        
    // Projections from rv1 onto rv2
    var rv3 = null;
    if (rv1 && rv2) {
        // Swap so longer sequence comes first
        if (rv2.length > rv1.length) {
            var tmp = rv2;
            rv2 = rv1;
            rv1 = tmp;
            
            tmp = c2;
            c2  = c1;
            c1  = tmp;
        }

        rv3 = new Array(rv1.length);
        var di1 = 0.;
        var di2 = 0.;
        var di3 = 0.;
        for (var i = 0; i < rv1.length; i++) {
            // Smooth growth rate
            di1 = di2;
            di2 = di3;
            di3 = (rv1[i] - rv1[i - 1]) / rv1[i - 1];
            if (i < rv2.length) {
                rv3[i] = rv2[i];
                continue;
            }

            var nv = rv3[i - 1] + rv3[i - 1] * (di1 * 0.5 + di2 * 0.3 + di3 * 0.2);
            rv3[i] = Math.floor(nv);
        }
    }

    var tra = [];

    if (rv1) {
        tra.push({
            type: "scatter",
            mode: "lines",
            name: c1,
            x: Arange(rv1.length),
            y: rv1,
            line: {color: '#A03020', width: 5}
        });
    }

    if (rv2) {
        tra.push({
            type: "scatter",
            mode: "lines",
            name: c2,
            x: Arange(rv2.length),
            y: rv2,
            line: {color: '#7F7F7F', width: 5}
        });
    }

    if (rv3) {
        tra.push({
            type: "scatter",
            mode: "lines",
            name: c2 + '-Pred',
            x: Arange(rv3.length),
            y: rv3,
            line: {color: '#7F7F7F', dash: 'dot', width: 5}
        });
    }

    Plot(tra);
}

function Zeros(n) {
    var X = new Array(n);
    for (var i = 0; i < n; i++)
        X[i] = 0;
    return X;
}

