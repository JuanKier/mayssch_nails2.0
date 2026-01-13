// Calendario interactivo con días de la semana
const calendar = document.getElementById('calendar');
const calendarHeaderText = document.getElementById('calendar-header-text');
const dayDetails = document.getElementById('day-details');
const selectedDaySpan = document.getElementById('selected-day');
const dayServices = document.getElementById('day-services');
const allServices = document.getElementById('all-services');
const modal = document.getElementById('service-modal');
const modalTitle = document.getElementById('modal-title');
const serviceForm = document.getElementById('service-form');
const monthSelect = document.getElementById('month-select');
const today = new Date();
let selectedDate = null;
let selectedMonth = today.getMonth();
let selectedYear = today.getFullYear();
let editingIndex = null;
let modalType = null;

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const predefinedSlots = ['08:00', '10:00', '13:00', '15:00'];

function generateMonthSelect() {
    monthSelect.innerHTML = '';
    for (let year = today.getFullYear() - 1; year <= today.getFullYear() + 2; year++) {
        for (let month = 0; month < 12; month++) {
            const option = document.createElement('option');
            option.value = `${month}-${year}`;
            option.textContent = `${monthNames[month]} ${year}`;
            if (month === selectedMonth && year === selectedYear) option.selected = true;
            monthSelect.appendChild(option);
        }
    }
}

function changeMonth(delta) {
    selectedMonth += delta;
    if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear--;
    } else if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear++;
    }
    generateCalendar();
}

function generateCalendar() {
    calendar.innerHTML = ''; // Limpiar el calendario antes de regenerarlo
    calendarHeaderText.textContent = `${monthNames[selectedMonth]} ${selectedYear}`;

    // Encabezados de días
    dayNames.forEach(name => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = name;
        calendar.appendChild(header);
    });

    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const services = JSON.parse(localStorage.getItem('services') || '[]');

    // Espacios vacíos para alinear el primer día
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day';
        calendar.appendChild(empty);
    }

    // Días del mes con turnos
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'day';
        const dayOfWeek = new Date(selectedYear, selectedMonth, i).getDay();
        const dayServicesList = getDaySlots(i, dayOfWeek, services);
        let turnosHtml = '';
        dayServicesList.forEach(slot => {
            if (slot.client) {
                // Si está ocupado, mostrar hora - Cliente
                turnosHtml += `<div>${slot.time} - ${slot.client}</div>`;
            } else {
                // Si está libre, solo mostrar la hora
                turnosHtml += `<div>${slot.time}</div>`;
            }
        });
        day.innerHTML = `<div class="day-number">${i}</div><div class="day-turnos">${turnosHtml}</div>`;
        day.onclick = () => selectDay(day, i);
        calendar.appendChild(day);
    }
}

function getDaySlots(day, dayOfWeek, services) {
    const slots = [];
    // Agregar predefinidos si no es domingo
    if (dayOfWeek !== 0) {
        predefinedSlots.forEach(time => {
            const booked = services.find(s => s.date == day && s.month == selectedMonth && s.year == selectedYear && s.time === time);
            slots.push({ time, client: booked ? booked.client : null, status: booked ? booked.status : null });
        });
    }
    // Agregar otros agendados que no sean predefinidos
    services.filter(s => s.date == day && s.month == selectedMonth && s.year == selectedYear && !predefinedSlots.includes(s.time)).forEach(s => {
        slots.push({ time: s.time, client: s.client, status: s.status });
    });
    return slots.sort((a, b) => a.time.localeCompare(b.time));
}

function selectDay(element, day) {
    document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
    element.classList.add('selected');
    selectedDate = day;
    selectedDaySpan.textContent = day;
    dayDetails.style.display = 'block';
    loadDayServices(day);
}

function loadDayServices(day) {
    const services = JSON.parse(localStorage.getItem('services') || '[]');
    const dayOfWeek = new Date(selectedYear, selectedMonth, day).getDay();
    const dayServicesList = getDaySlots(day, dayOfWeek, services);
    dayServices.innerHTML = '';
    if (dayServicesList.length === 0) {
        dayServices.innerHTML = '<p>No hay turnos para este día.</p>';
    } else {
        dayServicesList.forEach(slot => {
            const booked = services.find(s => s.date == day && s.month == selectedMonth && s.year == selectedYear && s.time === slot.time);
            const item = document.createElement('div');
            item.className = 'service-item';
            if (booked) {
                item.innerHTML = `
                    <div class="service-info">
                        Cliente: ${booked.client} - Hora: ${booked.time} - Estado: ${booked.status}
                    </div>
                    <div class="service-actions">
                        <button onclick="openModal('edit', ${services.indexOf(booked)})">Editar</button>
                        <button class="delete-btn" onclick="deleteService(${services.indexOf(booked)}, 'day')">Eliminar</button>
                    </div>
                `;
            } else {
                item.innerHTML = `
                    <div class="service-info">
                        Hora: ${slot.time}
                    </div>
                    <div class="service-actions">
                        <button onclick="openModal('book', null, '${slot.time}')">Agendar</button>
                    </div>
                `;
            }
            dayServices.appendChild(item);
        });
    }
}

function openModal(type, index = null, time = null) {
    modalType = type;
    editingIndex = index;
    modal.style.display = 'block';
    if (type === 'book') {
        modalTitle.textContent = 'Agendar Turno';
        serviceForm.reset();
        if (time) document.getElementById('time').value = time;
        monthSelect.value = `${selectedMonth}-${selectedYear}`;
        if (selectedDate) document.getElementById('date').value = selectedDate;
    } else if (type === 'edit') {
        modalTitle.textContent = 'Editar Turno';
        const services = JSON.parse(localStorage.getItem('services') || '[]');
        const service = services[index];
        document.getElementById('client').value = service.client;
        document.getElementById('time').value = service.time;
        document.getElementById('status').value = service.status;
        monthSelect.value = `${service.month}-${service.year}`;
        document.getElementById('date').value = service.date;
    }
}

function closeModal() {
    modal.style.display = 'none';
    serviceForm.reset();
    editingIndex = null;
    modalType = null;
}

function saveService() {
    const client = document.getElementById('client').value;
    const time = document.getElementById('time').value;
    const status = document.getElementById('status').value;
    const date = parseInt(document.getElementById('date').value);
    const [month, year] = monthSelect.value.split('-').map(Number);
    const services = JSON.parse(localStorage.getItem('services') || '[]');

    if (modalType === 'book') {
        services.push({ client, time, status, date, month, year });
    } else if (modalType === 'edit') {
        services[editingIndex] = { client, time, status, date, month, year };
    }

    localStorage.setItem('services', JSON.stringify(services));
    closeModal();
    generateCalendar();
    if (selectedDate) loadDayServices(selectedDate);
    loadAllServices();
}

function deleteService(index, from) {
    const services = JSON.parse(localStorage.getItem('services') || '[]');
    services.splice(index, 1);
    localStorage.setItem('services', JSON.stringify(services));
    generateCalendar();
    if (from === 'day' && selectedDate) loadDayServices(selectedDate);
    loadAllServices();
}

function loadAllServices() {
    const services = JSON.parse(localStorage.getItem('services') || '[]');
    allServices.innerHTML = '';
    if (services.length === 0) {
        allServices.innerHTML = '<p>No hay servicios agendados.</p>';
    } else {
        services.forEach((service, index) => {
            const item = document.createElement('div');
            item.className = 'service-item';
            item.innerHTML = `
                <div class="service-info">
                    Cliente: ${service.client} - Fecha: ${service.date}/${service.month + 1}/${service.year} - Hora: ${service.time} - Estado: ${service.status}
                </div>
                <div class="service-actions">
                    <button onclick="openModal('edit', ${index})">Editar</button>
                    <button class="delete-btn" onclick="deleteService(${index}, 'all')">Eliminar</button>
                </div>
            `;
            allServices.appendChild(item);
        });
    }
}

function onMonthSelectChange() {
    const [month, year] = monthSelect.value.split('-').map(Number);
    selectedMonth = month;
    selectedYear = year;
    generateCalendar();
}

function processPayment() {
    alert('Pago simulado procesado. ¡Gracias!');
}

// Inicialización
generateMonthSelect();
generateCalendar();
loadAllServices();
monthSelect.addEventListener('change', onMonthSelectChange);
serviceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    saveService();

});
