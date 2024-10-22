import React, { act, useCallback, useEffect, useState } from 'react'
import { App, Button, Calendar, Card, Col, Row, Spin } from 'antd'
import {
    LeftOutlined,
    RightOutlined,
    ArrowLeftOutlined,
} from '@ant-design/icons'
import WidgetWrapper from './WidgetWrapper'
import DragableHandle from './DragableHandle'
import PropTypes from 'prop-types'
import InputCalendar from '../../components/AAA-InputCalendar'
import InfiniteScroll from 'react-infinite-scroll-component'
import api from '../../axios-proxy'
import dayjs from 'dayjs'
import ActivityHyperlink from '../../components/ActivityHyperlink'
import DisplayDate from '../../components/DisplayDate'
import APP_MESSAGE from '../../app-message'
import { printer } from '../../components/test'

const SIZE = 5

const CalendarWidget = React.forwardRef(
    (
        {
            style,
            className,
            onMouseDown,
            onMouseUp,
            onTouchEnd,
            children,
            isDragging,

            ...props
        },
        ref
    ) => {
        const [showEvents, setShowEvents] = useState(false)
        const [selectedDate, setSelectedDate] = useState()

        const title = ({ value, type, onChange, onTypeChange }) => {
            return (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        fontSize: 12,
                    }}
                >
                    <div style={{ marginLeft: 'auto' }}>تقویم</div>
                    <Button
                        type="text"
                        icon={<RightOutlined />}
                        size="small"
                        onClick={() => {
                            const n = value.clone().month()
                            onChange(value.clone().month(n - 1))
                        }}
                    />
                    <div
                        style={{
                            textDecorationLine: 'underline',
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            setShowEvents(true)
                            setSelectedDate(value)
                        }}
                    >
                        {value.format('YYYY/MM/DD')}
                    </div>
                    <Button
                        type="text"
                        icon={<LeftOutlined />}
                        size="small"
                        onClick={() => {
                            const n = value.clone().month()
                            onChange(value.clone().month(n + 1))
                        }}
                    />
                    <DragableHandle />
                </div>
            )
        }

        const content = !showEvents ? (
            <InputCalendar
                title={title}
                setShowEvents={setShowEvents}
                setSelectedDate={setSelectedDate}
            />
        ) : (
            <>
                <Button
                    size="small"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setShowEvents(false)}
                />
                <AcitivitiesList selectedDate={selectedDate} />
            </>
        )

        return (
            <WidgetWrapper
                ref={ref}
                style={style}
                isDragging={isDragging}
                className={className}
                onMouseUp={onMouseUp}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                content={content}
                footer={children}
            />
        )
    }
)
CalendarWidget.displayName = 'CalendarWidget'
CalendarWidget.propTypes = {
    style: PropTypes.object,
    className: PropTypes.string,
    onMouseDown: PropTypes.func,
    onMouseUp: PropTypes.func,
    onTouchEnd: PropTypes.func,
    children: PropTypes.array,
    isDragging: PropTypes.bool,
}

export default CalendarWidget

const AcitivitiesList = ({ selectedDate }) => {
    const [activities, setActivities] = useState({
        total: null,
        page: 1,
        size: SIZE,
        items: [],
    })

    const { message } = App.useApp()

    const [loading, setLoading] = useState(false)

    const fetchData = useCallback(async (page) => {
        setLoading(true)
        try {
            const res = await api.get(`/api/activities/${SIZE}/${page}`)

            if (res.status !== 200) {
                throw new Error('Something went wrong.')
            }

            setActivities((prev) => ({
                ...res.data,
                items: [...prev.items, ...res.data.items],
            }))
        } catch (err) {
            message.error(APP_MESSAGE.DATA_LOADING_ERROR)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData(1)
    }, [fetchData])

    if (loading)
        return (
            <div
                style={{
                    height: '100%',
                    background: 'rgba(0,0,0,.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Spin tip="در حال بارگذاری">
                    <div
                        style={{
                            padding: 0,
                            width: 100,
                        }}
                    />
                </Spin>
            </div>
        )

    return (
        <div style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                {selectedDate.format('YYYY/MM/DD')}
            </div>
            <div id="scrollable-div">
                <InfiniteScroll
                    dataLength={activities.items.length}
                    next={() => fetchData(activities.page + 1)}
                    hasMore={activities.items.length < activities.total}
                    scrollableTarget="scrollable-div"
                    style={{ display: 'flex', flexDirection: 'column' }}
                >
                    {activities.items.length !== 0 ? (
                        activities.items.map((activity) => {
                            console.log(activity)
                            return (
                                <Card
                                    key={activity.id}
                                    styles={{ body: { padding: '10px' } }}
                                    style={{ margin: 2 }}
                                >
                                    <Row
                                        gutter={24}
                                        style={{ marginBottom: 10 }}
                                    >
                                        <Col xs={24}>
                                            <ActivityHyperlink
                                                activity={activity}
                                                showNumber
                                            />
                                        </Col>
                                    </Row>
                                    <Row gutter={24}>
                                        {[
                                            {
                                                title: 'شروع در:',
                                                value: 'startAt',
                                            },
                                            {
                                                title: 'برنامه ریزی شده در:',
                                                value: 'scheduledAt',
                                            },
                                            {
                                                title: 'خاتمه در:',
                                                value: 'endsAt',
                                            },
                                            {
                                                title: 'ایجاد شده در:',
                                                value: 'createdAt',
                                            },
                                        ].map((item) => (
                                            <Col
                                                key={activity.id}
                                                xs={24}
                                                lg={6}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    fontSize: 12,
                                                }}
                                            >
                                                <div> {item.title} </div>
                                                <DisplayDate
                                                    date={activity[item.value]}
                                                />
                                            </Col>
                                        ))}
                                    </Row>
                                </Card>
                            )
                        })
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            هیچ آیتمی وجود ندارد.
                        </div>
                    )}
                </InfiniteScroll>
            </div>
        </div>
    )
}

AcitivitiesList.propTypes = {
    selectedDate: PropTypes.object,
}
