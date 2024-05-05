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
        f: 0
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


//##################################### Data generation #####################################3
function updateChartData(chart, dataPoint) {
    chart.data.labels.push(parseFloat(currentTime).toFixed(1));

    Object.keys(dataPoint).forEach((key) => {
        let dataset = chart.data.datasets.find(d => d.label === key);
        if (!dataset) {
            // Si el dataset no existe, lo crea
            dataset = {
                label: key,
                data: [],
                fill: false,
                hidden: key === 'v'
            };
            chart.data.datasets.push(dataset);
        }
        dataset.data.push(dataPoint[key]); // Añade el dato actual al dataset correspondiente

    });

    chart.update();

}


let currentTime = 0;
let isRunning = false;
const dt = 0.1;
let culture = new CultureGenerator(morg_data, bior_data, conditions);

function generateData() {
    if (!isRunning) return;
    const totalTime = culture.culture.totalTime;
    if (currentTime >= totalTime) {
        console.log("Finished generating data.");
        return;
    }
    checkForPendingActions();

    const latestData = culture.grow(dt);
    //console.log(latestData);

    updateChartData(myChart, latestData);

    currentTime+=dt;
    setTimeout(generateData, 1000 - generationSpeed);
}



// Timeline buttons
document.getElementById('play').addEventListener('click', function () {
    actionList = extractActionsData();
    isRunning = true;
    generateData();
});

document.getElementById('pause').addEventListener('click', function () {
    isRunning = false;
});

document.getElementById('followData').addEventListener('click', function () {
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
document.getElementById("cultureSpeed").addEventListener("change", function () {
    generationSpeed = document.getElementById("cultureSpeed").value
})

document.getElementById("reset").addEventListener("click", function () {
    culture = new CultureGenerator(morg_data, bior_data, conditions);
    myChart.data.labels = [];
    myChart.data.datasets.forEach(dataset => {
        dataset.data = [];
    });
    myChart.update();

    currentTime = 0;
});



// ######################################### PANEL DE ACCIONES  #######################################################


document.addEventListener('DOMContentLoaded', function () {
    let actionCount = 0;
    let draggedItem = null;

    const actionPanel = document.getElementById('actionPanel');
    actionPanel.addEventListener('dragover', function (event) {
        event.preventDefault(); // Necesario para permitir el drop
    });

    actionPanel.addEventListener('drop', function (event) {
        event.preventDefault();
        const cardBody = event.target.closest('.card');
        if (draggedItem && cardBody && draggedItem !== cardBody && !draggedItem.contains(cardBody)) {
            const rect = cardBody.getBoundingClientRect();
            const offsetY = event.clientY - rect.top;

            if (offsetY < (rect.height / 2)) {
                // Inserta el elemento arrastrado antes del elemento destino
                cardBody.parentNode.insertBefore(draggedItem, cardBody);
            } else {
                // Inserta el elemento arrastrado después del elemento destino
                if (cardBody.nextSibling) {
                    cardBody.parentNode.insertBefore(draggedItem, cardBody.nextSibling);
                } else {
                    cardBody.parentNode.appendChild(draggedItem);
                }
            }
            reassignDragEvents(); // Reasignar eventos de drag después de mover un elemento
        } else if (draggedItem && !cardBody) {
            // Si el elemento se suelta en un área sin tarjetas, lo mueve al final
            actionPanel.appendChild(draggedItem);
            reassignDragEvents(); // Reasignar eventos de drag después de mover un elemento
        }
    });

    document.getElementById('addActionButton').addEventListener('click', addAction);

    function addAction() {
        const actionId = `action-${actionCount}`;
        const html = `
            <div class="card" id="${actionId}" draggable="true">
                <div class="card-body">
                    <h5 class="card-title">Acción</h5>
                    <p class="card-text">
                    <button type="button" class="btn btn-outline-secondary mb-2 toggle-button" id="overflow-${actionCount}">Revalse desactivado</button>
                        <input type="number" class="form-control mb-2" id="activation-time-${actionCount}" placeholder="Tiempo de activación (h)">
                        <input type="number" class="form-control mb-2" id="entry-speed-${actionCount}" placeholder="Velocidad de entrada (L/h)">
                        <input type="number" class="form-control mb-2" id="fce-concentration-${actionCount}" placeholder="Concentración de FCE">
                        <input type="number" class="form-control" id="fn-concentration-${actionCount}" placeholder="Concentración de FN">
                        <button class="btn btn-success accept-action-btn">Aceptar</button>
                    </p>
                </div>
            </div>
        `;
        const container = document.getElementById('actionPanel');
        const div = document.createElement('div');
        div.innerHTML = html;
        container.appendChild(div);
        actionCount++;
        reassignDragEvents(); // Asignar eventos de drag a todos los elementos después de añadir uno nuevo
    }
    

    function reassignDragEvents() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('dragstart', function (event) {
                draggedItem = card;
            });
            card.addEventListener('dragend', function (event) {
                draggedItem = null;
            });
        });
    }

    document.getElementById('actionPanel').addEventListener('click', function (event) {
        if (event.target.classList.contains('delete-action-btn')) {
            const action = event.target.closest('.card');
            action.parentNode.removeChild(action);
        } else if (event.target.classList.contains('accept-action-btn')) {
            const cardBody = event.target.closest('.card-body');
            acceptAction(cardBody);
        } else if (event.target.classList.contains('toggle-button')) {
            toggleButtonState(event.target);
        }
    });
    
    function toggleButtonState(button) {
        const isActive = button.getAttribute('data-active') === 'true';
        if (isActive) {
            button.setAttribute('data-active', 'false');
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-secondary');
            button.textContent = 'Revalse desactivado';
        } else {
            button.setAttribute('data-active', 'true');
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-success');
            button.textContent = 'Revalse activado';
        }
    }
    

    function acceptAction(cardBody) {
        const index = cardBody.parentNode.id.split('-')[1];
        const overflow = document.getElementById(`overflow-${index}`).getAttribute('data-active') === 'true' ? "Activado" : "Desactivado";
        const time = document.getElementById(`activation-time-${index}`).value;
        const entrySpeed = document.getElementById(`entry-speed-${index}`).value;
        const fce = document.getElementById(`fce-concentration-${index}`).value;
        const fn = document.getElementById(`fn-concentration-${index}`).value;
        
        
    const summaryHtml = `
        <h5 class="card-title">Acción</h5>
        <ul class="card-text list-unstyled">
            <li>inicio: ${time} h</li>
            <li>F: ${entrySpeed} L/h</li>
            <li>FCE: ${fce} cmol/l</li>
            <li>Fn: ${fn} cmol/l</li>
            <li>overflow: ${overflow}</li>
        </ul>
        <button class="btn btn-danger delete-action-btn" style="position: absolute; right: 20px; top: 20px;">Eliminar</button>
    `;
        cardBody.innerHTML = summaryHtml;
    }
});

let actionList;

function extractActionsData() {
    const cards = document.querySelectorAll('.card');
    const actionsData = [];
    cards.forEach(card => {
        const cardTextElements = card.querySelectorAll('.card-text li'); // Seleccionar elementos li dentro de .card-text
        const actionDetails = {};
        
        cardTextElements.forEach(item => {
            const textContent = item.textContent;
            const colonIndex = textContent.indexOf(':');
            const key = textContent.substring(0, colonIndex).trim();
            let value = textContent.substring(colonIndex + 1).trim();

            // Convertir los valores "Activado" o "Desactivado" a números 1 y 0 respectivamente
            if (value === "Activado") {
                value = 1;
            } else if (value === "Desactivado") {
                value = 0;
            } else {
                // Intentar convertir otros valores a números, asignar 0 si no son numéricos
                const numericValue = parseFloat(value);
                value = isNaN(numericValue) ? 0 : numericValue;
            }

            actionDetails[key] = value;
        });

        actionsData.push(actionDetails);
    });
    return actionsData;
}



function checkForPendingActions() {
    for (let i = 0; i < actionList.length; i++) {
        let action = actionList[i];
        if (parseFloat(currentTime-dt).toFixed(1) === parseFloat(action.inicio).toFixed(1)) {
            culture.addFlux(action.F, action.FCE, action.Fn);
            if (action.overflow === 1){
                culture.addOverflow();
            }
            console.log(action)
        }
    }
}
