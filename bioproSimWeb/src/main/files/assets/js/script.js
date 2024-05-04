import { CultureGenerator } from './CultureGenerator.js';


// Datos de ejemplo, reemplaza con tus propios datos o usa fetch para cargarlos
const morg_data = {
    umax: 0.4, ms: 0.05, yxsv: 0.7, starve_counter: 2
};
const bior_data = {
    kla: 1000
};
let conditions;
getConditionParameters()



function getConditionParameters() {
    var totalTime = parseFloat(document.getElementById("totalTime").value);
    var volume = parseFloat(document.getElementById("volume").value);
    var inoculum = parseFloat(document.getElementById("inoculum").value);
    var initialFCE = parseFloat(document.getElementById("initialFCE").value);
    var initialFn = parseFloat(document.getElementById("initialFn").value);

    conditions = {
        totalTime: totalTime,
        v: volume,
        xv: inoculum,
        fce: initialFCE,
        fn: initialFn,
        f:0
    };
}
document.getElementById("confirmInitialConditions").addEventListener("click", getConditionParameters)




const ctx = document.getElementById('myChart').getContext('2d');
const myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: []
    },
    options: {
        animation: false, // Desactiva todas las animaciones
        scales: {
            y: {
                beginAtZero: true, // Esto asegura que la escala Y comience en 0
            }
        },
        plugins: {
            zoom: {
                pan: {
                    enabled: true,
                },
                zoom: {
                    wheel: {
                        enabled: true,
                        mode: 'x'
                    },
                    pinch: {
                        enabled: true,
                        mode: 'x'
                    },
                    mode: 'x'
                }
            }
        },
    }

});








function updateChartData(chart, dataPoint) {
    chart.data.labels.push(parseFloat(dt * currentIndex).toFixed(1));

    Object.keys(dataPoint).forEach((key) => {
        let dataset = chart.data.datasets.find(d => d.label === key);
        if (!dataset) {
            // Si el dataset no existe, lo crea
            dataset = {
                label: key,
                data: [],
                fill: false
            };
            chart.data.datasets.push(dataset);
        }
        dataset.data.push(dataPoint[key]); // Añade el dato actual al dataset correspondiente

    });

    chart.update();

}



let currentIndex = 0;
let isRunning = false;
const dt = 0.1;
let culture = new CultureGenerator(morg_data, bior_data, conditions);

function generateData() {
    if (!isRunning) return;
    const latestData = culture.grow(dt);
    console.log(latestData)

    updateChartData(myChart, latestData);

    currentIndex++;
    setTimeout(generateData, 1000-generationSpeed);

}



// Timeline buttons
document.getElementById('play').addEventListener('click', function () {
    isRunning = true;
    generateData();
});

document.getElementById('pause').addEventListener('click', function () {
    isRunning = false;
});

document.getElementById('followData').addEventListener('click', function() {
    const chart = myChart;
    const dataset = chart.data.datasets[0];
    if (dataset.data.length > 0) {
        const lastLabel = chart.data.labels[chart.data.labels.length - 1];
        chart.options.scales.x.min = lastLabel - 10; // Muestra los últimos 10 puntos
        chart.options.scales.x.max = lastLabel;
        chart.update();
    }
});

let generationSpeed = document.getElementById("cultureSpeed").value 
document.getElementById("cultureSpeed").addEventListener("change", function(){
    generationSpeed = document.getElementById("cultureSpeed").value
})

document.getElementById("reset").addEventListener("click", function() {
    culture = new CultureGenerator(morg_data, bior_data, conditions);
    myChart.data.labels = [];
    myChart.data.datasets.forEach(dataset => {
        dataset.data = [];
    });
    myChart.update();

    currentIndex = 0;
});



// Parameters buttons
document.getElementById('setFlow').addEventListener('click', setFlow);
document.getElementById('activateOverflow').addEventListener('click', activateOverflow);


function setFlow() {
    var flowValue = document.getElementById('flow').value;
    var fceValue = document.getElementById('reservoirFce').value;
    var fnValue = document.getElementById('reservoirFn').value;

    culture.addFlux(flowValue, fceValue, fnValue);
}


function activateOverflow() {
    culture.addOverflow();
}
