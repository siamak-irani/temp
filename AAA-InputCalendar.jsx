import { Badge, Button, Calendar, DatePicker, theme } from 'antd'
import dayjsGenerateConfig from 'rc-picker/lib/generate/dayjs'
import React, { useEffect, useState } from 'react'
import { PropTypes } from 'prop-types'
import dayjs from 'dayjs'
import { HOLIDAYS } from './AAA-holidays-data'
import api from '../axios-proxy'

// jalali-plugin-dayjs

const CustomCalendar = Calendar.generateCalendar({
    ...dayjsGenerateConfig,
    locale: {
        ...dayjsGenerateConfig.locale,
        getShortMonths: () => {
            return 'فروردین_اردیبهشت_خرداد_تیر_مرداد_شهریور_مهر_آبان_آذر_دی_بهمن_اسفند'.split(
                '_'
            )
        },
    },
})

const isThisDayHoliday = (date) => {
    const gregoryDate = date.calendar('gregory')

    const isHoliday = HOLIDAYS.allHolidays.some((holiday) => {
        const [year, month, day] = holiday.split('-')
        return (
            date.year() === +year &&
            date.month() === +month - 1 &&
            date.date() === +day
        )
    })

    return isHoliday
}

const InputCalendar = ({ title, setShowEvents, setSelectedDate }) => {
    const [activities, setActivities] = useState()
    const fetchMonthActivities = async (panelDate) => {
        const res = api.get(
            `/api/activities?year=${panelDate.year()}&month=${panelDate.month()}`
        )
        if (res.status !== 200) throw new Error('Something went wrong.')
        setActivities(res.data.items)
    }

    const {
        token: { colorPrimary, colorError },
    } = theme.useToken()

    const [panelDate, setPanelDate] = useState(dayjs())

    const onPanelChange = (value) => {
        setPanelDate(value)
    }

    const dateChangeHandler = (value, selectInfo) => {
        if (selectInfo.source === 'date') {
            setSelectedDate(value)
        }
    }

    const cellRender = (date, info) => {
        const isToday = dayjs().isSame(date, 'day')
        const isWeekend = date.day() === 5
        const isInThisMonth = panelDate.month() === date.month()

        const isHoliday = isThisDayHoliday(date)
        // const isHoliday = false

        const getStyle = () => {
            const styles = {
                borderRadius: 3,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'transparent',
                width: '2rem',
                height: '2rem',
                padding: '0 5px',
                margin: 'auto',
            }

            if (isToday) {
                styles.background = isToday ? colorPrimary : 'white'
                styles.color = isToday ? 'white' : 'unset'
            }
            if (isHoliday) {
                styles.background = colorError
                styles.color = 'white'
            }
            if (!isInThisMonth) {
                styles.opacity = 0.5
            }
            return styles
        }

        return (
            <div style={getStyle()} onClick={() => setShowEvents(true)}>
                <div>{date.date()}</div>
                <Badge dot={true} />
            </div>
        )
    }

    return (
        <>
            <CustomCalendar
                style={{ fontSize: 12 }}
                fullCellRender={cellRender}
                fullscreen={false}
                headerRender={title}
                onSelect={dateChangeHandler}
                onPanelChange={onPanelChange}
            />
        </>
    )
}

export default InputCalendar

InputCalendar.propTypes = {
    title: PropTypes.func,
    setShowEvents: PropTypes.func,
    setSelectedDate: PropTypes.func,
}
