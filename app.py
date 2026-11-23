"""Streamlit-обёртка: показывает сайт семинара, опубликованный на GitHub Pages.

Сам сайт лежит в index.html / js / css / presentations и публикуется GitHub Pages.
Этот файл нужен только для Streamlit Community Cloud (Main file path: app.py).
"""
import streamlit as st
import streamlit.components.v1 as components

SITE_URL = "https://olenver-04.github.io/ai-seminar/"

st.set_page_config(
    page_title="ИИ в учебных материалах",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Убираем лишние отступы Streamlit, чтобы сайт занимал всё окно.
st.markdown(
    """
    <style>
      .block-container { padding: 0.5rem 0.5rem 0 0.5rem; max-width: 100%; }
      header[data-testid="stHeader"] { display: none; }
      footer { display: none; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.link_button("Открыть сайт в отдельной вкладке (полный экран, PowerPoint)", SITE_URL)

components.iframe(SITE_URL, height=900, scrolling=True)
